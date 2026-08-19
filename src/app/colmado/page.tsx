import type { Metadata } from "next";
import Colmado from "@/views/Colmado";
import { loadHubProducts } from "@/lib/pim/featured";

export const metadata: Metadata = {
  title: "Colmado",
  description:
    "Producto gourmet pensado para tiendas, mercados y supermercados especializados. Alta rotación, márgenes saneados y reposición ágil.",
  alternates: { canonical: "/colmado" },
};

export const revalidate = 3600;

export default async function ColmadoPage() {
  const { featured, primerPrecio } = await loadHubProducts({ catalogSlug: "retail", limit: 24 });
  return (
    <Colmado
      featured={featured.products}
      featuredCatalogCount={featured.catalogPublishedCount}
      primerPrecio={primerPrecio.products}
      primerPrecioCatalogCount={primerPrecio.catalogPublishedCount}
    />
  );
}
