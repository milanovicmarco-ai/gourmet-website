// Helpers para cargar listas curadas de productos para las páginas públicas.
//
// Una vez asignados productos a un catálogo (HORECA, retail, fromages, …) desde
// el PIM, y marcados con los flags `destacado` o `primer_precio`, estas funciones
// los traen filtrados, publicados, con overlay aplicado.

import { getRefsByCatalogSlug, getFamilyMetas, humanizeFamilySlug } from "./catalogs";
import { getProductByRef, type ApiProduct } from "./api";
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
 *  UNA sola vez. Hace 1 fetch por ref EN PARALELO — cada uno cacheable 10 min,
 *  así que tras la 1ª visita las siguientes son instantáneas. */
async function loadCatalogContext(catalogSlug: string) {
  const [refs, familyMetas] = await Promise.all([
    getRefsByCatalogSlug(catalogSlug).catch(() => [] as string[]),
    getFamilyMetas().catch(() => ({} as Record<string, { display_name: string | null }>)),
  ]);
  if (refs.length === 0) {
    return { refs: [] as string[], published: [] as ApiProduct[], metas: {} as Record<string, ProductMeta>, familyMetas };
  }

  // Fetch por ref en paralelo. Más fiable que `listProducts({limit:200})` que
  // perdería productos del catálogo que estén en posición 201+ del listado global.
  const products = (
    await Promise.all(refs.map((r) => getProductByRef(r).catch(() => null)))
  ).filter((p): p is ApiProduct => p != null);

  const published = products.filter(
    (p) => (p.status ?? (p.active === false ? "archived" : "published")) === "published",
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

/** Límite por defecto de una lista curada. Cheese Lovers (`fromages`) es un
 *  catálogo curado COMPLETO: muestra TODOS los destacados, no la vitrina de 4
 *  de los otros hubs (colmado/secrets-du-xef). Un `limit` explícito siempre manda.
 *  ponytail: si algún día son demasiados, paginar; por ahora YAGNI. */
export const curatedLimit = (catalogSlug: string, limit?: number): number =>
  limit ?? (catalogSlug === "fromages" ? Infinity : 4);

/** Backward-compatible API: 1 llamada = 1 filtro. Internamente reusa loadCatalogContext. */
export async function loadCuratedProducts(opts: LoadOpts): Promise<CuratedResult> {
  const ctx = await loadCatalogContext(opts.catalogSlug);
  const products = applyFilter(ctx, opts.catalogSlug, opts.filter, curatedLimit(opts.catalogSlug, opts.limit));
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
