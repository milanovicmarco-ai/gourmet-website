// Cliente HTTP del backend Aurellano (Neon + Cloudinary).
//
// IMPORTANTE: las funciones que escriben usan ADMIN_API_KEY (server-only).
// No las llames desde un componente "use client" — usa Server Actions.

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
 *  el VPS del socio en Europa; si no contesta en X segundos, asumimos fallo y
 *  dejamos que la página renderice sin esos datos en vez de colgarse 5 minutos.
 *  20s es generoso pero ajustado al peor caso real observado. */
const FETCH_TIMEOUT_MS = 20_000;

async function timeoutFetch(input: string, init?: RequestInit & { next?: { revalidate?: number } }) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
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
    next: { revalidate: params?.revalidate ?? 0 },
  });
  if (!res.ok) throw new Error(`listProducts ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getProductByRef(ref: string, revalidate = 0): Promise<ApiProduct | null> {
  const res = await timeoutFetch(`${AURELLANO_API}/catalog/products/${encodeURIComponent(ref)}`, {
    next: { revalidate },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getProductByRef ${res.status}: ${await res.text()}`);
  return res.json();
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

/** Trae TODOS los productos del catálogo iterando por familia para sortear el cap
 * de 200 por request de la API. Útil para listados que filtran en memoria por
 * campos que la API no expone (marca, score, flags overlay, etc.). */
export async function fetchAllProducts(opts?: {
  q?: string;
  revalidate?: number;
}): Promise<ApiProduct[]> {
  const families = await listFamilies(opts?.revalidate ?? 600).catch(() => []);
  const map = new Map<string, ApiProduct>();

  // Pasada base: cubre productos sin familia asignada y los primeros 200 globales.
  const baseRes = await listProducts({ limit: 200, q: opts?.q, revalidate: opts?.revalidate ?? 300 }).catch(
    () => ({ results: [] as ApiProduct[] }),
  );
  for (const p of baseRes.results) map.set(p.ref, p);

  // Una pasada por cada familia (200 max por familia → cubre catálogos razonables).
  await Promise.all(
    families.map(async (f) => {
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
    }),
  );

  return Array.from(map.values());
}

export async function listFamilies(revalidate = 3600): Promise<FamilyCount[]> {
  const res = await timeoutFetch(`${AURELLANO_API}/catalog/families`, {
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`listFamilies ${res.status}: ${await res.text()}`);
  return res.json();
}
