import type { Metadata } from "next";
import Quesos from "@/views/Quesos";
import { loadCuratedProducts } from "@/lib/pim/featured";

export const metadata: Metadata = {
  title: "Fromages",
  description:
    "Selección de quesos afinados por origen, intensidad y familia. DOP, artesanos y veganos. Maridajes y montaje de tabla a medida.",
  alternates: { canonical: "/quesos" },
};

export const revalidate = 600;

export default async function QuesosPage() {
  const featured = await loadCuratedProducts({
    catalogSlug: "formages",
    filter: "destacado",
  });
  return (
    <Quesos
      featured={featured.products}
      featuredCatalogCount={featured.catalogPublishedCount}
    />
  );
}
