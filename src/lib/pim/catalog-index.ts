// Índice ligero del catálogo público.
//
// Antes cada render del catálogo/landings pedía a la API los ~700 productos
// COMPLETOS (1,5 MB) o, en las landings, un fetch por producto (hasta 356).
// Aquí construimos UNA vez al día (o al editar en el PIM, vía revalidateTag) un
// índice con solo los campos de listado + los overlays de Supabase (metas,
// catálogos, traducciones CA). Todo lo público filtra en memoria sobre él.
//
// Debe pesar < 2 MB (límite de la Data Cache de Next); ~250 KB hoy.

import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/integrations/supabase/server";
import { AURELLANO_API, isPublished, type ApiProduct } from "./api";
import { EMPTY_META, type ProductMeta } from "./product-meta";
import { snapshotAllProducts } from "./snapshot";
import { catalogFetch } from "./catalog-backend";

export const CATALOG_INDEX_TAG = "catalog-index";
const REVALIDATE_SECONDS = 86_400;

/** Campos de ApiProduct que realmente usan listados, tarjetas y filtros. */
export type IndexProduct = Pick<
  ApiProduct,
  | "ref" | "slug" | "name" | "family" | "brand" | "image_url" | "descripcion_corta"
  | "sin_gluten" | "sin_lactosa" | "vegetariano" | "active" | "status"
>;

export type CatalogIndex = {
  products: IndexProduct[];
  /** ref → overlay (solo productos con fila en product_meta). */
  metas: Record<string, ProductMeta>;
  /** ref → slugs de catálogos de publicación. */
  catalogsByRef: Record<string, string[]>;
  /** ref → traducción CA (solo nombre y descripción corta). */
  ca: Record<string, { name?: string | null; descripcion_corta?: string | null }>;
};

const PAGE_SIZE = 200; // cap de la API
const MAX_PAGES = 5; // 1000 productos (hoy ~700); avisa si se llena la última

async function fetchApiPage(offset: number): Promise<ApiProduct[]> {
  // `view=list` hace que la API devuelva solo campos de listado (cuando lo
  // soporta); si la versión desplegada lo ignora, devuelve el producto completo
  // y abajo nos quedamos igualmente solo con los campos del índice.
  const url = `${AURELLANO_API}/catalog/products?limit=${PAGE_SIZE}&offset=${offset}&view=list`;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20_000);
    try {
      // cache:"no-store": la respuesta cruda puede pasar de 2 MB; cacheamos el
      // ÍNDICE resultante (unstable_cache), no cada página de la API.
      const res = await catalogFetch(url, { cache: "no-store", signal: ctrl.signal });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = (await res.json()) as { results: ApiProduct[] };
      return json.results;
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(t);
    }
  }
  // Un fallo parcial NO se traga: cachear un índice incompleto 24 h sería peor
  // que fallar y conservar el último bueno.
  throw new Error(`[catalog-index] offset=${offset}: ${(lastErr as Error)?.message}`);
}

/** Lee TODAS las filas de una tabla de Supabase paginando (PostgREST corta a 1000). */
async function fetchAllRows<T>(
  table: string,
  select: string,
  filter?: (q: any) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<T[]> {
  const supabase = createPublicClient();
  const out: T[] = [];
  const step = 1000;
  for (let from = 0; ; from += step) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase.from(table as never).select(select);
    if (filter) q = filter(q);
    const { data, error } = await q.range(from, from + step - 1);
    if (error) throw new Error(`[catalog-index] ${table}: ${error.message}`);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < step) break;
  }
  return out;
}

async function buildCatalogIndex(): Promise<CatalogIndex> {
  let pages: ApiProduct[][];
  try {
    pages = await Promise.all(
      Array.from({ length: MAX_PAGES }, (_, i) => fetchApiPage(i * PAGE_SIZE)),
    );
  } catch (err) {
    // API caída: índice COMPLETO desde la foto de respaldo (nunca a medias).
    // Se cachea igual que el normal; la próxima revalidación (o una edición en
    // el PIM) lo reconstruye desde la API cuando vuelva.
    console.warn("[catalog-index] API falló, construyendo el índice desde la foto:", (err as Error).message);
    pages = [await snapshotAllProducts()];
  }
  if (pages.length === MAX_PAGES && pages[MAX_PAGES - 1].length === PAGE_SIZE) {
    console.warn("[catalog-index] la última página vino llena: sube MAX_PAGES, faltan productos.");
  }
  const seen = new Map<string, ApiProduct>();
  for (const page of pages) for (const p of page) seen.set(p.ref, p);

  const products: IndexProduct[] = [];
  for (const p of seen.values()) {
    if (!isPublished(p)) continue;
    products.push({
      ref: p.ref,
      slug: p.slug ?? null,
      name: p.name,
      family: p.family ?? null,
      brand: p.brand ?? null,
      image_url: p.image_url ?? null,
      descripcion_corta: p.descripcion_corta ?? null,
      sin_gluten: p.sin_gluten ?? null,
      sin_lactosa: p.sin_lactosa ?? null,
      vegetariano: p.vegetariano ?? null,
      active: p.active ?? null,
      status: p.status ?? null,
    });
  }

  const [metaRows, catRows, caRows] = await Promise.all([
    fetchAllRows<ProductMeta>("product_meta", "*"),
    fetchAllRows<{ product_ref: string; catalogs: { slug: string } | { slug: string }[] | null }>(
      "product_catalogs",
      "product_ref, catalogs!inner(slug)",
    ),
    fetchAllRows<{ product_ref: string; name: string | null; descripcion_corta: string | null }>(
      "product_translations",
      "product_ref, name, descripcion_corta",
      (q) => q.eq("locale", "ca"),
    ),
  ]);

  const published = new Set(products.map((p) => p.ref));
  const metas: CatalogIndex["metas"] = {};
  for (const m of metaRows) {
    if (published.has(m.product_ref)) metas[m.product_ref] = { ...EMPTY_META(m.product_ref), ...m };
  }

  const catalogsByRef: CatalogIndex["catalogsByRef"] = {};
  for (const r of catRows) {
    if (!published.has(r.product_ref)) continue;
    const c = Array.isArray(r.catalogs) ? r.catalogs[0] : r.catalogs;
    if (c?.slug) (catalogsByRef[r.product_ref] ??= []).push(c.slug);
  }

  const ca: CatalogIndex["ca"] = {};
  for (const t of caRows) {
    if (!published.has(t.product_ref)) continue;
    if (t.name?.trim() || t.descripcion_corta?.trim()) {
      ca[t.product_ref] = { name: t.name, descripcion_corta: t.descripcion_corta };
    }
  }

  return { products, metas, catalogsByRef, ca };
}

/** Índice cacheado 24 h; se invalida con `revalidateTag(CATALOG_INDEX_TAG)`. */
export const getCatalogIndex = unstable_cache(buildCatalogIndex, ["catalog-index-v1"], {
  revalidate: REVALIDATE_SECONDS,
  tags: [CATALOG_INDEX_TAG],
});
