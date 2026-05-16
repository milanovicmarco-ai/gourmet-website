// Helpers para cargar listas curadas de productos para las páginas públicas.
//
// Una vez asignados productos a un catálogo (HORECA, retail, formages, …) desde
// el PIM, y marcados con los flags `destacado` o `primer_precio`, estas funciones
// los traen filtrados, publicados, con overlay aplicado (display_ref, brand).

import { getRefsByCatalogSlug } from "./catalogs";
import { getProductByRef } from "./api";
import { getMetasForProducts, effectiveRef } from "./product-meta";

export type CuratedProduct = {
  ref: string;
  slug: string;
  name: string;
  family: string;
  image_url: string | null;
};

type LoadOpts = {
  catalogSlug: string;
  /** Qué flag del overlay debe estar a true para incluir el producto. */
  filter: "destacado" | "primer_precio";
  limit?: number;
};

/** Resultado enriquecido para que las páginas hub puedan mostrar mensajes de
 *  diagnóstico precisos cuando la lista está vacía. */
export type CuratedResult = {
  products: CuratedProduct[];
  /** Cuántos productos publicados hay en el catálogo (sin aplicar el flag). */
  catalogPublishedCount: number;
};

/** Trae hasta `limit` productos publicados de un catálogo que cumplan el flag
 *  indicado en su `product_meta` (destacado o primer_precio). */
export async function loadCuratedProducts(opts: LoadOpts): Promise<CuratedResult> {
  const limit = opts.limit ?? 4;
  const tag = `[loadCurated ${opts.catalogSlug}/${opts.filter}]`;
  const refs = await getRefsByCatalogSlug(opts.catalogSlug).catch((err) => {
    console.warn(`${tag} getRefsByCatalogSlug error:`, (err as Error).message);
    return [];
  });
  console.log(`${tag} refs en catálogo: ${refs.length}`);
  if (refs.length === 0) return { products: [], catalogPublishedCount: 0 };

  // Trae cada producto en paralelo, ignora 404 (refs huérfanas).
  const results = await Promise.all(refs.map((r) => getProductByRef(r).catch(() => null)));
  const products = results.filter((p): p is NonNullable<typeof p> => p != null);
  const published = products.filter(
    (p) => (p.status ?? (p.active === false ? "archived" : "published")) === "published",
  );
  console.log(`${tag} productos fetched: ${products.length}, publicados: ${published.length}`);
  if (published.length === 0) return { products: [], catalogPublishedCount: 0 };

  // Aplica el filtro del flag mediante el overlay.
  const metas = await getMetasForProducts(published.map((p) => p.ref)).catch(() => ({}));
  const flagKey = opts.filter; // "destacado" | "primer_precio"
  const debug = published.map((p) => {
    const m = metas[p.ref];
    const flagValue = m ? m[flagKey] : undefined;
    return { ref: p.ref, hasMeta: !!m, [flagKey]: flagValue };
  });
  console.log(`${tag} estado flag por producto:`, debug);

  const matching = published.filter((p) => {
    const m = metas[p.ref];
    if (!m) return false;
    return opts.filter === "destacado" ? !!m.destacado : !!m.primer_precio;
  });
  console.log(`${tag} matching: ${matching.length}`);

  const mapped = matching.slice(0, limit).map((p) => ({
    ref: effectiveRef(metas[p.ref], p.ref),
    slug: p.slug ?? p.ref,
    name: p.name,
    family: p.family ?? "",
    image_url: p.image_url ?? null,
  }));

  return { products: mapped, catalogPublishedCount: published.length };
}
