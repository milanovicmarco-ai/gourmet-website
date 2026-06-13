import type { Metadata } from "next";
import SecretsDelXef from "@/views/SecretsDelXef";
import { loadHubProducts } from "@/lib/pim/featured";

export const metadata: Metadata = {
  title: "Secrets du Xef",
  description: "4a i 5a gamma per a l'hostaleria: plats preparats d'autor i ingredients diferencials que estalvien temps sense renunciar al criteri.",
  alternates: {
    canonical: "/ca/secrets-du-xef",
    languages: {
      "es-ES": "/es/secrets-du-xef",
      "ca-ES": "/ca/secrets-du-xef",
    },
  },
};

// Lee del catálogo HORECA con los flags destacado / primer_precio. Dinámica
// porque queremos que los cambios del PIM se reflejen sin redeploy.
export const revalidate = 3600;

export default async function SecretsPage() {
  const { featured, primerPrecio } = await loadHubProducts({ catalogSlug: "horeca" });
  return (
    <SecretsDelXef
      featured={featured.products}
      featuredCatalogCount={featured.catalogPublishedCount}
      primerPrecio={primerPrecio.products}
      primerPrecioCatalogCount={primerPrecio.catalogPublishedCount}
    />
  );
}
