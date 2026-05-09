import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetail from "@/pages/ProductDetail";
import { getProductBySlug, getProductByRef, type ApiProduct } from "@/lib/pim/api";

type Params = { slug: string };

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
      title: `${title} | Aurellano Productos Gastronómicos`,
      description,
      images: product.image_url ? [product.image_url] : undefined,
    },
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
  return <ProductDetail product={product} />;
}
