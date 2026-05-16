import type { Metadata } from "next";
import { listActiveInspirationCatalogs } from "@/lib/pim/inspiration";
import { InspiracionView } from "@/pages/Inspiracion";

export const metadata: Metadata = {
  title: "Inspiración",
  description:
    "Catálogos y colecciones gourmet de Aurellano y nuestras marcas distribuidas. Descárgalos en PDF.",
  alternates: { canonical: "/inspiracion" },
};

// Pública dinámica: cuando Marco sube/edita un catálogo desde el PIM, se refleja
// inmediatamente en la web. listActiveInspirationCatalogs ya filtra a active=true.
export const dynamic = "force-dynamic";

export default async function InspiracionPage() {
  const catalogs = await listActiveInspirationCatalogs();
  return <InspiracionView catalogs={catalogs} />;
}
