import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetail from "@/pages/ProductDetail";
import { getProduct } from "@/lib/products";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) {
    return { title: "Producto no encontrado" };
  }
  const title = `${product.name}`.slice(0, 60);
  const description = (product.description || "").slice(0, 155);
  return {
    title,
    description,
    alternates: { canonical: `/producto/${slug}` },
    openGraph: {
      title: `${title} | Aurellano Productos Gastronómicos`,
      description,
      images: product.image ? [product.image] : undefined,
    },
  };
}

export default async function ProductoPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  return <ProductDetail slug={slug} />;
}
