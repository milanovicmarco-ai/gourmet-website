// Helpers para cargar listas curadas de productos para las páginas públicas.
//
// Una vez asignados productos a un catálogo (HORECA, retail, formages, …) desde
// el PIM, y marcados con los flags `destacado` o `primer_precio`, estas funciones
// los traen filtrados, publicados, con overlay aplicado.

import { getRefsByCatalogSlug, getFamilyMetas, humanizeFamilySlug } from "./catalogs";
import { listProducts, type ApiProduct } from "./api";
import { getMetasForProducts, effectiveRef, type ProductMeta } from "./product-meta";

export type CuratedProduct = {
  ref: string;
  slug: string;
  name: string;
  /** Display name resuelto (overlay families_meta → fallback humanizado). */
  family: string;
  image_url: string | null;
};

type FilterKind = "destacado" | "primer_precio";

export type CuratedResult = {
  products: CuratedProduct[];
  catalogPublishedCount: number;
};

/** Carga el contexto base de un catálogo (refs + productos + metas + families)
 *  UNA sola vez. Reusa el cache de fetch de Next.js (10 min) en visitas
 *  subsiguientes. */
async function loadCatalogContext(catalogSlug: string) {
  const [refs, productsRes, familyMetas] = await Promise.all([
    getRefsByCatalogSlug(catalogSlug).catch(() => [] as string[]),
    listProducts({ limit: 200 }).catch(() => ({ results: [] as ApiProduct[] })),
    getFamilyMetas().catch(() => ({} as Record<string, { display_name: string | null }>)),
  ]);
  if (refs.length === 0) {
    return { refs: [] as string[], published: [] as ApiProduct[], metas: {} as Record<string, ProductMeta>, familyMetas };
  }
  const refSet = new Set(refs);
  const published = productsRes.results.filter(
    (p) =>
      refSet.has(p.ref) &&
      (p.status ?? (p.active === false ? "archived" : "published")) === "published",
  );
  const metas = published.length
    ? await getMetasForProducts(published.map((p) => p.ref)).catch(() => ({} as Record<string, ProductMeta>))
    : ({} as Record<string, ProductMeta>);
  return { refs, published, metas, familyMetas };
}

/** Filtra `published` aplicando el flag pedido (destacado/primer_precio) y
 *  devuelve los primeros `limit` ya mapeados al shape de CuratedProduct. */
function applyFilter(
  ctx: Awaited<ReturnType<typeof loadCatalogContext>>,
  catalogSlug: string,
  filter: FilterKind,
  limit: number,
): CuratedProduct[] {
  const { published, metas, familyMetas } = ctx;

  const matching = published.filter((p) => {
    const m = metas[p.ref];
    if (!m) return false;
    if (filter === "primer_precio") return !!m.primer_precio;
    const en = Array.isArray(m.destacado_en) ? m.destacado_en : [];
    if (en.length > 0) return en.includes(catalogSlug);
    return !!m.destacado;
  });

  matching.sort((a, b) =>
    a.ref.localeCompare(b.ref, undefined, { numeric: true, sensitivity: "base" }),
  );

  const familyLabel = (slug: string | null | undefined): string => {
    if (!slug) return "";
    const m = familyMetas[slug];
    return m?.display_name?.trim() || humanizeFamilySlug(slug);
  };

  return matching.slice(0, limit).map((p) => ({
    ref: effectiveRef(metas[p.ref], p.ref),
    slug: p.slug ?? p.ref,
    name: p.name,
    family: familyLabel(p.family),
    image_url: p.image_url ?? null,
  }));
}

type LoadOpts = {
  catalogSlug: string;
  filter: FilterKind;
  limit?: number;
};

/** Backward-compatible API: 1 llamada = 1 filtro. Internamente reusa loadCatalogContext. */
export async function loadCuratedProducts(opts: LoadOpts): Promise<CuratedResult> {
  const ctx = await loadCatalogContext(opts.catalogSlug);
  const products = applyFilter(ctx, opts.catalogSlug, opts.filter, opts.limit ?? 4);
  return { products, catalogPublishedCount: ctx.published.length };
}

/** Carga DESTACADOS + PRIMER PRECIO del mismo catálogo en una sola pasada —
 *  comparte refs/products/metas/families. Reduce 8 round-trips a 4. */
export async function loadHubProducts(opts: { catalogSlug: string; limit?: number }): Promise<{
  featured: CuratedResult;
  primerPrecio: CuratedResult;
}> {
  const limit = opts.limit ?? 4;
  const ctx = await loadCatalogContext(opts.catalogSlug);
  return {
    featured: {
      products: applyFilter(ctx, opts.catalogSlug, "destacado", limit),
      catalogPublishedCount: ctx.published.length,
    },
    primerPrecio: {
      products: applyFilter(ctx, opts.catalogSlug, "primer_precio", limit),
      catalogPublishedCount: ctx.published.length,
    },
  };
}
