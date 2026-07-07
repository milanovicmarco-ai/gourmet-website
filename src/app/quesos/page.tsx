import type { Metadata } from "next";
import Quesos from "@/views/Quesos";
import { loadCuratedProducts } from "@/lib/pim/featured";

export const metadata: Metadata = {
  title: "Quesos para enamorarse",
  description:
    "Selección de quesos afinados por origen, intensidad y familia. DOP, artesanos y veganos. Maridajes y montaje de tabla a medida.",
  alternates: { canonical: "/quesos" },
};

export const revalidate = 3600;

export default async function QuesosPage() {
  const featured = await loadCuratedProducts({
    catalogSlug: "fromages",
    filter: "destacado",
    // Cheese Lovers es un catálogo curado: se muestran TODOS los destacados,
    // sin el tope de 4 de las vitrinas de otros hubs. // ponytail: si algún día
    // son demasiados, paginar; por ahora YAGNI.
    limit: Infinity,
  });
  return (
    <Quesos
      featured={featured.products}
      featuredCatalogCount={featured.catalogPublishedCount}
    />
  );
}
