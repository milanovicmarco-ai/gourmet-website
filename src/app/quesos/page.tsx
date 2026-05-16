import type { Metadata } from "next";
import Quesos from "@/pages/Quesos";
import { loadCuratedProducts } from "@/lib/pim/featured";

export const metadata: Metadata = {
  title: "Formages",
  description:
    "Selección de quesos afinados por origen, intensidad y familia. DOP, artesanos y veganos. Maridajes y montaje de tabla a medida.",
  alternates: { canonical: "/quesos" },
};

export const dynamic = "force-dynamic";

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
