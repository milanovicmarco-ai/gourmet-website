// Helpers para cargar listas curadas de productos para las páginas públicas.
//
// Una vez asignados productos a un catálogo (HORECA, retail, fromages, …) desde
// el PIM, y marcados con los flags `destacado` o `primer_precio`, estas funciones
// los traen filtrados, publicados, con overlay aplicado.

import { getFamilyMetas, humanizeFamilySlug } from "./catalogs";
import { isPublished, type ApiProduct } from "./api";
import { getCatalogIndex } from "./catalog-index";
import { effectiveRef, type ProductMeta } from "./product-meta";
import { forEachLimited } from "./concurrency";

/** Máx. refs consultadas en paralelo en el fan-out de un catálogo. Acota la
 *  carga contra el pool del backend socio (incidente QueuePool 7-jul-2026) y
 *  mantiene los reintentos de timeout dentro de un límite. */
const REF_FETCH_CONCURRENCY = 6;

/** Fan-out THROTTLED sobre `refs`, clasificando cada resultado:
 *  - producto → se incluye
 *  - `null` (404, ausencia legítima: producto borrado) → se omite, NO es fallo
 *  - throw (timeout/5xx tras agotar reintentos) → cuenta como fallo de carga
 *  `fetchOne` es inyectable para test. */
export async function fetchRefsResilient(
  refs: string[],
  fetchOne: (ref: string) => Promise<ApiProduct | null>,
  concurrency = REF_FETCH_CONCURRENCY,
): Promise<{ products: ApiProduct[]; failedRefCount: number }> {
  const products: ApiProduct[] = [];
  let failedRefCount = 0;
  await forEachLimited(refs, concurrency, async (ref) => {
    try {
      const p = await fetchOne(ref);
      if (p) products.push(p);
    } catch (err) {
      failedRefCount++;
      console.warn(`[fetchRefsResilient] ref "${ref}" no cargó: ${(err as Error).message}`);
    }
  });
  return { products, failedRefCount };
}

/** ¿El render de una lista curada está probadamente incompleto? Solo una lista
 *  COMPLETA (sin cap, limit=Infinity, p.ej. fromages) puede estarlo: si perdió
 *  refs por fallo de carga, faltan productos. Una vitrina capada nunca lo está:
 *  nunca prometió mostrar todo. */
export const isCuratedRenderIncomplete = (limit: number, failedRefCount: number): boolean =>
  limit === Infinity && failedRefCount > 0;

/** Durante `next build`, NEXT_PHASE = "phase-production-build"; en runtime, no. */
const isBuildPhase = (): boolean => process.env.NEXT_PHASE === "phase-production-build";

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

/** Carga el contexto base de un catálogo (productos + metas + familias) desde el
 *  índice ligero cacheado: 0 llamadas a la API del socio por render. Antes hacía
 *  un fetch por producto del catálogo (hasta 356 por regeneración de página). */
async function loadCatalogContext(catalogSlug: string) {
  const [index, familyMetas] = await Promise.all([
    getCatalogIndex(),
    getFamilyMetas().catch(() => ({} as Record<string, { display_name: string | null }>)),
  ]);
  const published = index.products.filter(
    (p) => isPublished(p) && index.catalogsByRef[p.ref]?.includes(catalogSlug),
  ) as ApiProduct[];
  const metas: Record<string, ProductMeta> = {};
  for (const p of published) if (index.metas[p.ref]) metas[p.ref] = index.metas[p.ref];
  return { refs: published.map((p) => p.ref), published, metas, familyMetas, failedRefCount: 0 };
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
  const limit = curatedLimit(opts.catalogSlug, opts.limit);
  // Freeze-guard: si la lista es curada-COMPLETA (sin cap, p.ej. fromages) y
  // perdimos refs por fallo de carga, el render está incompleto. Lanzar en
  // REVALIDACIÓN hace que ISR conserve el último render completo (prerender de
  // build o una revalidación previa buena) en vez de congelar uno incompleto ~1h.
  // En `next build` NO lanzamos: un backend flaky no debe romper el deploy.
  if (isCuratedRenderIncomplete(limit, ctx.failedRefCount) && !isBuildPhase()) {
    throw new Error(
      `[loadCuratedProducts] "${opts.catalogSlug}": ${ctx.failedRefCount} ref(s) no cargaron → ` +
      `render incompleto; se conserva el último render completo (no se cachea este).`,
    );
  }
  const products = applyFilter(ctx, opts.catalogSlug, opts.filter, limit);
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
