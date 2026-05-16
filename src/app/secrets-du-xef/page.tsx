import type { Metadata } from "next";
import SecretsDelXef from "@/pages/SecretsDelXef";
import { loadCuratedProducts } from "@/lib/pim/featured";

export const metadata: Metadata = {
  title: "Secrets du Xef",
  description:
    "4ª y 5ª gama para hostelería: platos preparados de autor e ingredientes diferenciales que ahorran tiempo sin renunciar al criterio.",
  alternates: { canonical: "/secrets-du-xef" },
};

// Lee del catálogo HORECA con los flags destacado / primer_precio. Dinámica
// porque queremos que los cambios del PIM se reflejen sin redeploy.
export const dynamic = "force-dynamic";

export default async function SecretsPage() {
  const [featured, primerPrecio] = await Promise.all([
    loadCuratedProducts({ catalogSlug: "horeca", filter: "destacado" }),
    loadCuratedProducts({ catalogSlug: "horeca", filter: "primer_precio" }),
  ]);
  return (
    <SecretsDelXef
      featured={featured.products}
      featuredCatalogCount={featured.catalogPublishedCount}
      primerPrecio={primerPrecio.products}
      primerPrecioCatalogCount={primerPrecio.catalogPublishedCount}
    />
  );
}
