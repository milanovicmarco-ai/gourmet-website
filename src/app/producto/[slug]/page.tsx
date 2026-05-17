import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import ProductDetail from "@/views/ProductDetail";
import { getProductBySlug, getProductByRef, type ApiProduct } from "@/lib/pim/api";
import { getTranslation, type Locale } from "@/lib/pim/translations";
import { getProductMeta, effectiveRef } from "@/lib/pim/product-meta";
import { getFamilyMetas, humanizeFamilySlug } from "@/lib/pim/catalogs";

type Params = { slug: string };

// Sin caché: la página renderiza según la cookie `aurellano_lang`, así que cada request
// puede ver una traducción distinta. La cache estática estaba sirviendo siempre la versión ES.
export const dynamic = "force-dynamic";

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

async function getLocale(): Promise<Locale | "es"> {
  const cookieStore = await cookies();
  const c = cookieStore.get("aurellano_lang")?.value;
  if (c === "ca" || c === "en") return c;
  return "es";
}

/** Aplica la traducción del overlay (CA) por encima de los datos canónicos (ES). */
function applyTranslation(product: ApiProduct, translation: Awaited<ReturnType<typeof getTranslation>>): ApiProduct {
  if (!translation) return product;
  return {
    ...product,
    name: translation.name?.trim() || product.name,
    descripcion_corta: translation.descripcion_corta?.trim() || product.descripcion_corta,
    description_rich: translation.description_rich?.trim() || product.description_rich,
    flavor: translation.flavor?.trim() || product.flavor,
    origen: translation.origen?.trim() || product.origen,
    ingredientes: translation.ingredientes?.trim() || product.ingredientes,
    seo_title: translation.seo_title?.trim() || product.seo_title,
    seo_description: translation.seo_description?.trim() || product.seo_description,
  };
}

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

  const locale = await getLocale();
  let display = product;
  if (locale === "ca" || locale === "en") {
    const translation = await getTranslation(product.ref, locale);
    display = applyTranslation(product, translation);
  }
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
