import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetail from "@/views/ProductDetail";
import { getProductBySlug, getProductByRef, type ApiProduct } from "@/lib/pim/api";
import { getProductMeta, effectiveRef } from "@/lib/pim/product-meta";
import { getFamilyMetas, humanizeFamilySlug } from "@/lib/pim/catalogs";

type Params = { slug: string };

// Cache 1h en el edge de Vercel. Antes era force-dynamic porque la página
// leía la cookie `aurellano_lang` para decidir idioma, pero desde el refactor
// i18n el idioma está en el path (/es/ vs /ca/), así que cada subruta es
// estable y puede cachearse. CRÍTICO: sin este cache, cada visita pegaba
// directamente al VPS del socio sin paso por el edge.
export const revalidate = 3600;

// El slug oficial es "{slugify(name)}-{ref}". Si by-slug 404 (porque el slug ha
// cambiado, o el catálogo viene con otro formato), intentamos por la `ref` que
// suele ser el último segmento numérico/alfanumérico tras el último guión.
async function fetchProduct(slugOrRef: string): Promise<ApiProduct | null> {
  const direct = await getProductBySlug(slugOrRef).catch(() => null);
  if (direct) return direct;

  // Fallback 1: el parámetro entero como ref (cuando el link es /producto/{ref}).
  const asRef = await getProductByRef(slugOrRef).catch(() => null);
  if (asRef) return asRef;

  // Fallback 2: extrae lo que parece la ref (último segmento tras guión).
  const lastSegment = slugOrRef.split("-").pop();
  if (lastSegment && lastSegment !== slugOrRef) {
    const byTail = await getProductByRef(lastSegment).catch(() => null);
    if (byTail) return byTail;
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) return { title: "Producto no encontrado" };

  const title = (product.seo_title ?? product.name).slice(0, 60);
  const description = (product.seo_description ?? product.descripcion_corta ?? "").slice(0, 155);

  return {
    title,
    description,
    alternates: { canonical: `/producto/${product.slug ?? slug}` },
    openGraph: {
      title: `${title} | Aurellano Productes Gastronòmics`,
      description,
      images: product.image_url ? [product.image_url] : undefined,
    },
  };
}

// Esta página es la subruta /es/producto, así que el contenido es siempre
// el ES canónico de la API. No leemos overlay de traducción aquí — eso solo
// tiene sentido en /ca/producte. (Antes había getLocale + cookie 'aurellano_lang'
// que es residuo pre-i18n y mezclaba idiomas según el navegador del usuario.)

export default async function ProductoPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) notFound();
  // La web pública sólo enseña productos publicados.
  const effectiveStatus =
    product.status ?? (product.active === false ? "archived" : "published");
  if (effectiveStatus !== "published") notFound();

  // En /es/producto siempre mostramos la fuente canónica (ES de la API).
  const display = product;
  // Overlay de nuestro Supabase: la ref visible (display_ref) y la marca real
  // (brand_override). La API trata ambos como problemáticos (PK inmutable, FK estricta),
  // así que la fuente de verdad para el usuario final son estos campos.
  const [meta, familyMetas] = await Promise.all([
    getProductMeta(product.ref).catch(() => null),
    getFamilyMetas().catch(() => ({})),
  ]);
  const displayRef = effectiveRef(meta, product.ref);
  const brandOverride = meta?.brand_override?.trim();
  const familySlug = display.family ?? null;
  const familyDisplay = familySlug
    ? familyMetas[familySlug]?.display_name?.trim() || humanizeFamilySlug(familySlug)
    : null;
  return (
    <ProductDetail
      product={{
        ...display,
        ref: displayRef,
        brand: brandOverride && brandOverride.length > 0 ? brandOverride : display.brand,
      }}
      familySlug={familySlug}
      familyDisplay={familyDisplay}
    />
  );
}
