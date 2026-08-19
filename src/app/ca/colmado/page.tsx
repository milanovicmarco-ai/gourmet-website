import type { Metadata } from "next";
import Colmado from "@/views/Colmado";
import { loadHubProducts } from "@/lib/pim/featured";

export const metadata: Metadata = {
  title: "Colmado",
  description: "Producte gourmet pensat per a botigues, mercats i supermercats especialitzats. Alta rotació, marges sanejats i reposició àgil.",
  alternates: {
    canonical: "/ca/colmado",
    languages: {
      "es-ES": "/es/colmado",
      "ca-ES": "/ca/colmado",
    },
  },
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
