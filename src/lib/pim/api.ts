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

/** ¿El producto es visible en la web pública? Publicado Y activo.
 *  El soft-delete del admin pone active=false pero DEJA status="published", así
 *  que hay que exigir AMBOS: `status ?? …` solo (el patrón viejo) dejaba pasar
 *  los borrados. sitemap.ts ya trataba active===false como no-público. */
export const isPublished = (p: Pick<ApiProduct, "active" | "status">): boolean =>
  p.active !== false && (p.status ?? "published") === "published";

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
  offset?: number;
  family?: string;
  q?: string;
  revalidate?: number;
}): Promise<ProductsListResponse> {
  const sp = new URLSearchParams();
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.offset) sp.set("offset", String(params.offset));
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

export async function getProductByRef(
  ref: string,
  revalidate = 3600,
  opts?: { retryTimeout?: boolean },
): Promise<ApiProduct | null> {
  // 8s por intento. El backend arranca lento tras inactividad (cold start del
  // contenedor FastAPI) y la 1ª request desde Vercel a veces excede 6s, así que
  // 8s da margen sin colgar. Hasta 2 intentos. Por defecto (la FICHA individual)
  // solo se reintenta ante error de RED o 5xx: un timeout propio (AbortError)
  // significa backend saturado → reintentar amplificaría la ráfaga (#15).
  // Los LISTADOS públicos pasan `retryTimeout` para reintentar TAMBIÉN el timeout
  // y no perder productos por un timeout intermitente (van throttled → acotado).
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
      const res = await timeoutFetch(url, cacheOpts, 8_000);
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
      // Timeout propio (AbortError): por defecto NO se reintenta (amplifica la
      // ráfaga, #15). Un error de red siempre. Un timeout SOLO si retryTimeout
      // (listados: van throttled, el reintento queda acotado).
      const isTimeout = lastErr.name === "AbortError";
      const retryable = !isTimeout || opts?.retryTimeout === true;
      if (retryable && attempt < 2) {
        console.warn(`[getProductByRef] intento ${attempt} falló (${lastErr.message}), reintentando…`);
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      break;
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

/** Offsets que barre `fetchAllProducts` en paralelo. Con el cap de 200 por
 *  request de la API, cubre hasta 1000 productos en UNA sola ronda de red.
 *  Catálogo actual: ~690 productos → margen de sobra. Súbelo si el catálogo
 *  crece por encima de ~900 (el warning al final avisa). */
const PAGE_OFFSETS = [0, 200, 400, 600, 800] as const;

/** Trae TODOS los productos del catálogo. Útil para listados que filtran en
 *  memoria por campos que la API no expone (marca, dieta, flags overlay, etc.).
 *
 *  Estrategia: paginación por offset en PARALELO (todas las páginas a la vez).
 *  Es lo más rápido posible dado el cap de 200/request: wall-clock ≈ 1 llamada.
 *  Sustituye al fan-out por familia (que hacía ~15 llamadas en 4 tandas ≈ 4×
 *  la latencia de una llamada). Con `q` (búsqueda libre), la API ignora offset
 *  y filtra server-side devolviendo pocos resultados → 1 llamada basta. */
export async function fetchAllProducts(opts?: {
  q?: string;
  revalidate?: number;
}): Promise<ApiProduct[]> {
  const revalidate = opts?.revalidate ?? 3600;

  // Búsqueda libre: la API filtra server-side, resultados pequeños, offset se
  // ignora. Una sola llamada.
  if (opts?.q) {
    const res = await listProducts({ limit: 200, q: opts.q, revalidate }).catch(
      () => ({ results: [] as ApiProduct[] }),
    );
    return res.results;
  }

  // Sin búsqueda: barrer offsets en paralelo. Cada Promise cachea de forma
  // independiente en el edge de Vercel (misma URL = misma entrada de cache).
  const pages = await Promise.all(
    PAGE_OFFSETS.map((offset) =>
      listProducts({ limit: 200, offset, revalidate }).catch(
        () => ({ results: [] as ApiProduct[] }),
      ),
    ),
  );

  // Si la última página vuelve llena, el catálogo pasó del rango cubierto y
  // faltan productos. Añade más offsets a PAGE_OFFSETS.
  const last = pages[pages.length - 1];
  if (last.results.length === 200) {
    console.warn(
      `[fetchAllProducts] offset=${PAGE_OFFSETS[PAGE_OFFSETS.length - 1]} devolvió 200 items (cap saturado). Amplía PAGE_OFFSETS o hay productos sin cargar.`,
    );
  }

  // Dedup por ref: si dos páginas se solapan (orden inestable del backend),
  // el Map se queda con una sola copia. Barato y correcto.
  const map = new Map<string, ApiProduct>();
  for (const page of pages) {
    for (const p of page.results) map.set(p.ref, p);
  }
  return Array.from(map.values());
}

export async function listFamilies(revalidate = 3600): Promise<FamilyCount[]> {
  const res = await timeoutFetch(`${AURELLANO_API}/catalog/families`, {
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`listFamilies ${res.status}: ${await res.text()}`);
  return res.json();
}
