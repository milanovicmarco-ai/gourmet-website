import type { Metadata } from "next";
import Index, { type FeaturedProduct } from "@/views/Index";
import { BRAND } from "@/lib/brand";
import { getRefsByCatalogSlug, getFamilyMetas, humanizeFamilySlug } from "@/lib/pim/catalogs";
import { getProductByRef } from "@/lib/pim/api";
import { getMetasForProducts, effectiveRef } from "@/lib/pim/product-meta";

export const metadata: Metadata = {
  // En la home no aplicamos el template "%s | naming" — usamos el naming + claim directamente.
  title: `${BRAND.es.name} · ${BRAND.es.claim} ${BRAND.es.claimSub}`,
  description: BRAND.es.description,
  alternates: { canonical: "/" },
};

// La home es dinámica porque la sección "Selección curada" lee productos del
// catálogo `seleccion-aurellano` (overlay Supabase + API del socio) y queremos
// que los cambios del PIM se reflejen sin redeploy.
export const dynamic = "force-dynamic";

const FEATURED_CATALOG = "seleccion-aurellano";
const FEATURED_LIMIT = 4;

async function loadFeatured(): Promise<FeaturedProduct[]> {
  const refs = await getRefsByCatalogSlug(FEATURED_CATALOG).catch(() => []);
  if (refs.length === 0) return [];
  // Trae cada producto en paralelo, ignora 404s (productos borrados que aún tienen
  // fila huérfana en product_catalogs — defensivo).
  const results = await Promise.all(refs.map((r) => getProductByRef(r).catch(() => null)));
  const products = results.filter((p): p is NonNullable<typeof p> => p != null);
  // Sólo publicados
  const published = products.filter(
    (p) => (p.status ?? (p.active === false ? "archived" : "published")) === "published",
  );
  if (published.length === 0) return [];
  const [metas, familyMetas] = await Promise.all([
    getMetasForProducts(published.map((p) => p.ref)).catch(() => ({})),
    getFamilyMetas().catch(() => ({})),
  ]);
  const familyLabel = (slug: string | null | undefined): string => {
    if (!slug) return "";
    return familyMetas[slug]?.display_name?.trim() || humanizeFamilySlug(slug);
  };
  return published.slice(0, FEATURED_LIMIT).map((p) => ({
    ref: effectiveRef(metas[p.ref], p.ref),
    slug: p.slug ?? p.ref,
    name: p.name,
    family: familyLabel(p.family),
    image_url: p.image_url ?? null,
  }));
}

export default async function HomePage() {
  const featured = await loadFeatured();
  return <Index featured={featured} />;
}
