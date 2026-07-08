// Tira de "Selección Aurellano" — primeros ~20 productos del catálogo
// de publicación `seleccion-aurellano`. Se monta en una <Suspense> para
// que aparezca lo antes posible mientras el catálogo grande sigue cargando.

import { ProductCard } from "@/components/ProductCard";
import { getRefsByCatalogSlug, getFamilyMetas, humanizeFamilySlug } from "@/lib/pim/catalogs";
import { getProductByRef, isPublished } from "@/lib/pim/api";
import { getMetasForProducts, effectiveRef } from "@/lib/pim/product-meta";

const FEATURED_CATALOG = "seleccion-aurellano";
const FEATURED_LIMIT = 20;

interface Props {
  /** Base de URL para producto: "/es/producto" o "/ca/producte". */
  productHrefBase: string;
}

export async function CatalogFeatured({ productHrefBase }: Props) {
  const refs = await getRefsByCatalogSlug(FEATURED_CATALOG).catch(() => [] as string[]);
  if (refs.length === 0) return null;

  // Fetch por ref en paralelo (cada uno cacheable 1h en el edge).
  const results = await Promise.all(refs.map((r) => getProductByRef(r).catch(() => null)));
  const published = results
    .filter((p): p is NonNullable<typeof p> => p != null)
    .filter(isPublished)
    .slice(0, FEATURED_LIMIT);

  if (published.length === 0) return null;

  const [metas, familyMetas] = await Promise.all([
    getMetasForProducts(published.map((p) => p.ref)).catch(() => ({})),
    getFamilyMetas().catch(() => ({})),
  ]);

  const familyLabel = (slug: string | null | undefined): string => {
    if (!slug) return "—";
    return familyMetas[slug]?.display_name?.trim() || humanizeFamilySlug(slug);
  };

  return (
    <section className="container-edit pb-12 md:pb-16">
      <div className="border-b border-border pb-4 mb-8 flex items-baseline justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          Selección Aurellano
        </p>
        <p className="text-xs text-muted-foreground">{published.length} destacados</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        {published.map((p) => (
          <ProductCard
            key={p.ref}
            image={p.image_url ?? "/images/placeholder.svg"}
            title={p.name}
            category={familyLabel(p.family)}
            origin={`Ref. ${effectiveRef(metas[p.ref], p.ref)}`}
            href={`${productHrefBase}/${p.slug ?? p.ref}`}
          />
        ))}
      </div>
    </section>
  );
}

/** Skeleton de la tira de featured, mostrado como fallback de la Suspense. */
export function CatalogFeaturedSkeleton() {
  return (
    <section className="container-edit pb-12 md:pb-16">
      <div className="border-b border-border pb-4 mb-8 flex items-baseline justify-between">
        <div className="h-3 w-44 bg-muted rounded animate-pulse" />
        <div className="h-3 w-24 bg-muted rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[4/5] bg-muted rounded-2xl animate-pulse" />
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}
