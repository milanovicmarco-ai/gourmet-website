import type { Metadata } from "next";
import Colmado from "@/views/Colmado";
import { loadCuratedProducts } from "@/lib/pim/featured";

export const metadata: Metadata = {
  title: "Colmado",
  description: "Producto gourmet pensado para tiendas, mercados y supermercados especializados. Alta rotación, márgenes saneados y reposición ágil.",
  alternates: {
    canonical: "/es/colmado",
    languages: {
      "es-ES": "/es/colmado",
      "ca-ES": "/ca/colmado",
    },
  },
};

export const revalidate = 3600;

export default async function ColmadoPage() {
  const featured = await loadCuratedProducts({ catalogSlug: "retail", filter: "destacado", limit: 24 });
  return (
    <Colmado
      featured={featured.products}
      featuredCatalogCount={featured.catalogPublishedCount}
    />
  );
}
