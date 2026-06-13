import type { Metadata } from "next";
import Quesos from "@/views/Quesos";
import { loadCuratedProducts } from "@/lib/pim/featured";

export const metadata: Metadata = {
  title: "Formatges per enamorar-se",
  description: "Selecció de formatges afinats per origen, intensitat i família. DOP, artesans i vegans. Maridatges i muntatge de taula a mida.",
  alternates: {
    canonical: "/ca/formatges",
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
