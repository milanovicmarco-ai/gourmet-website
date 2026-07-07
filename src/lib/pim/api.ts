// Cliente HTTP del backend Aurellano (Neon + Cloudinary).
//
// IMPORTANTE: las funciones que escriben usan ADMIN_API_KEY (server-only).
// No las llames desde un componente "use client" — usa Server Actions.

import { forEachLimited } from "./concurrency";

export const AURELLANO_API =
  process.env.NEXT_PUBLIC_AURELLANO_API ?? "https://aurellano-api.srv1124642.hstgr.cloud";

// =============================================================
// Tipos del producto que devuelve la API (lo que está en Neon).
// =============================================================
export type FormatoOpcion = {
  label: string;
  peso_kg?: number | null;
  precio_eur?: number | null;
};

export type ApiProduct = {
  ref: string;
  slug?: string | null;
  name: string;
  family?: string | null;
  subfamily?: string | null;
  brand?: string | null;
  supplier?: string | null;
  unit_base?: string | null;
  base_price_eur?: number | null;
  iva_pct?: number | null;
  stock_actual?: number | null;
  stock_minimo?: number | null;
  units_per_box?: number | null;
  descripcion_corta?: string | null;
  description_rich?: string | null;
  ingredientes?: string | null;
  alergenos?: string | string[] | null;
  info_nutricional?: unknown;
  origen?: string | null;
  flavor?: string | null;
  formato_opciones?: FormatoOpcion[] | null;
  tags?: string[] | null;
  pairings?: string[] | null;
  sin_gluten?: boolean | null;
  sin_lactosa?: boolean | null;
  vegetariano?: boolean | null;
  refrigerado?: boolean | null;
  venta_a_granel?: boolean | null;
  peso_variable?: boolean | null;
  image_url?: string | null;
  gallery?: string[] | null;
  families?: string[] | null;
  active?: boolean | null;
  status?: "draft" | "published" | "archived" | null;
  optimization_score?: number | null;
  seo_title?: string | null;
  seo_description?: string | null;
  score?: number | null; // sólo en /products?q=
};

export type ProductsListResponse = {
  query?: string;
  results: ApiProduct[];
};

export type FamilyCount = { family: string; count: number };

// =============================================================
// LECTURAS (públicas — sin auth).
// =============================================================

/** Timeout default para fetches a la API del socio. Vercel está en US-East y
 *  el VPS del socio en Europa. El backend sano responde ~0,6s por producto y
 *  aguanta 50 peticiones concurrentes en ~3s, así que 6s deja amplio margen
 *  para el peor caso legítimo y a la vez CORTA los productos que se cuelgan:
 *  antes, con 20s, un único ref que no respondía arrastraba la página entera
 *  hasta el timeout porque loadCatalogContext espera con Promise.all. Si un
 *  fetch lo excede, .catch() lo descarta y la página renderiza sin ese dato.
 *
 *  Pero para detalles individuales (getProductByRef del PIM), 6s es DEMASIADO
 *  corto si la API arranca lenta (cold start tras inactividad) — provoca
 *  notFound() fantasma. En esos casos sube el timeout pasando el parámetro
 *  opcional a timeoutFetch. */
const FETCH_TIMEOUT_MS = 6_000;

async function timeoutFetch(
  input: string,
  init?: RequestInit & { next?: { revalidate?: number } },
  timeoutMs: number = FETCH_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function listProducts(params?: {
  limit?: number;
  family?: string;
  q?: string;
  revalidate?: number;
}): Promise<ProductsListResponse> {
  const sp = new URLSearchParams();
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.family) sp.set("family", params.family);
  if (params?.q) sp.set("q", params.q);

  const res = await timeoutFetch(`${AURELLANO_API}/catalog/products?${sp.toString()}`, {
    // Cache 1 hora en el edge de Vercel. Reduce drásticamente latencia tras la
    // primera carga. Cuando Marco edita en el PIM, las server actions hacen
    // revalidatePath y refrescan en seguida.
    next: { revalidate: params?.revalidate ?? 3600 },
  });
  if (!res.ok) throw new Error(`listProducts ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getProductByRef(ref: string, revalidate = 3600): Promise<ApiProduct | null> {
  // 20s por intento. El backend de Hostinger arranca lento tras inactividad
  // (cold start del contenedor FastAPI) y la primera request desde Vercel
  // a veces excede 6s. Hacemos hasta 2 intentos: si el primero falla con
  // timeout, abort o 5xx, reintentamos una vez tras 500ms. El segundo
  // intento suele acertar porque el contenedor ya está caliente.
  //
  // revalidate = 0 → cache:"no-store" (fresh siempre). El editor del PIM
  // lo usa así. Revalidate > 0 → cacheable en el edge de Vercel, para el
  // catálogo público.
  const cacheOpts = revalidate === 0
    ? { cache: "no-store" as const }
    : { next: { revalidate } };
  const url = `${AURELLANO_API}/catalog/products/${encodeURIComponent(ref)}`;

  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await timeoutFetch(url, cacheOpts, 20_000);
      if (res.status === 404) return null;
      if (!res.ok) {
        const body = await res.text();
        // 4xx (no 404) no es transitorio — no merece reintento.
        if (res.status >= 400 && res.status < 500) {
          throw new Error(`getProductByRef ${res.status}: ${body}`);
        }
        // 5xx → reintenta
        lastErr = new Error(`getProductByRef ${res.status}: ${body}`);
        if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      return res.json();
    } catch (err) {
      lastErr = err as Error;
      // AbortError / network error → reintenta una vez
      if (attempt < 2) {
        console.warn(`[getProductByRef] intento ${attempt} falló (${lastErr.message}), reintentando…`);
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
    }
  }
  throw lastErr ?? new Error("getProductByRef agotó intentos sin error claro");
}

export async function getProductBySlug(slug: string, revalidate = 3600): Promise<ApiProduct | null> {
  const res = await timeoutFetch(
    `${AURELLANO_API}/catalog/products/by-slug/${encodeURIComponent(slug)}`,
    { next: { revalidate } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getProductBySlug ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Máx. familias consultadas en paralelo dentro de fetchAllProducts. En serie
 *  el listado tarda demasiado; ~20 a la vez saturaban el pool del backend
 *  (incidente 7-jul-2026). 4 es el punto medio. */
const FAMILY_FETCH_CONCURRENCY = 4;

/** Trae TODOS los productos del catálogo iterando por familia para sortear el cap
 * de 200 por request de la API. Útil para listados que filtran en memoria por
 * campos que la API no expone (marca, score, flags overlay, etc.). */
export async function fetchAllProducts(opts?: {
  q?: string;
  revalidate?: number;
}): Promise<ApiProduct[]> {
  const families = await listFamilies(opts?.revalidate ?? 3600).catch(() => []);
  const map = new Map<string, ApiProduct>();

  // Pasada base: cubre productos sin familia asignada y los primeros 200 globales.
  const baseRes = await listProducts({ limit: 200, q: opts?.q, revalidate: opts?.revalidate ?? 300 }).catch(
    () => ({ results: [] as ApiProduct[] }),
  );
  for (const p of baseRes.results) map.set(p.ref, p);

  // Una pasada por cada familia (200 max por familia → cubre catálogos razonables),
  // en LOTES de FAMILY_FETCH_CONCURRENCY — no todas a la vez, que saturaba el pool.
  await forEachLimited(families, FAMILY_FETCH_CONCURRENCY, async (f) => {
    const res = await listProducts({
      limit: 200,
      family: f.family,
      q: opts?.q,
      revalidate: opts?.revalidate ?? 300,
    }).catch(() => ({ results: [] as ApiProduct[] }));
    if (res.results.length === 200) {
      console.warn(
        `[fetchAllProducts] familia "${f.family}" devolvió 200 (cap saturado). Podría haber productos sin cargar.`,
      );
    }
    for (const p of res.results) map.set(p.ref, p);
  });

  return Array.from(map.values());
}

export async function listFamilies(revalidate = 3600): Promise<FamilyCount[]> {
  const res = await timeoutFetch(`${AURELLANO_API}/catalog/families`, {
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`listFamilies ${res.status}: ${await res.text()}`);
  return res.json();
}
