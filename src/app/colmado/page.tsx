import type { Metadata } from "next";
import Colmado from "@/pages/Colmado";
import { loadCuratedProducts } from "@/lib/pim/featured";

export const metadata: Metadata = {
  title: "Colmado",
  description:
    "Producto gourmet pensado para tiendas, mercados y supermercados especializados. Alta rotación, márgenes saneados y reposición ágil.",
  alternates: { canonical: "/colmado" },
};

export const dynamic = "force-dynamic";

export default async function ColmadoPage() {
  const [featured, primerPrecio] = await Promise.all([
    loadCuratedProducts({ catalogSlug: "retail", filter: "destacado" }),
    loadCuratedProducts({ catalogSlug: "retail", filter: "primer_precio" }),
  ]);
  return (
    <Colmado
      featured={featured.products}
      featuredCatalogCount={featured.catalogPublishedCount}
      primerPrecio={primerPrecio.products}
      primerPrecioCatalogCount={primerPrecio.catalogPublishedCount}
    />
  );
}
