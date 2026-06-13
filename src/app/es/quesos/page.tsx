import type { Metadata } from "next";
import Quesos from "@/views/Quesos";
import { loadCuratedProducts } from "@/lib/pim/featured";

export const metadata: Metadata = {
  title: "Quesos para enamorarse",
  description: "Selección de quesos afinados por origen, intensidad y familia. DOP, artesanos y veganos. Maridajes y montaje de tabla a medida.",
  alternates: {
    canonical: "/es/quesos",
    languages: {
      "es-ES": "/es/quesos",
      "ca-ES": "/ca/formatges",
    },
  },
};

export const revalidate = 3600;

export default async function QuesosPage() {
  const featured = await loadCuratedProducts({
    catalogSlug: "fromages",
    filter: "destacado",
  });
  return (
    <Quesos
      featured={featured.products}
      featuredCatalogCount={featured.catalogPublishedCount}
    />
  );
}
