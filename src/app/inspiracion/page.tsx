import type { Metadata } from "next";
import { listActiveInspirationCatalogs } from "@/lib/pim/inspiration";
import { InspiracionView } from "@/views/Inspiracion";

export const metadata: Metadata = {
  title: "Inspiración",
  description:
    "Catálogos y colecciones gourmet de Aurellano y nuestras marcas distribuidas. Descárgalos en PDF.",
  alternates: { canonical: "/inspiracion" },
};

// Revalida cada 10 min; los Server Actions de inspiration hacen revalidatePath
// al subir/editar/borrar catálogos PDF así que los cambios se reflejan al momento.
export const revalidate = 600;

export default async function InspiracionPage() {
  const catalogs = await listActiveInspirationCatalogs();
  return <InspiracionView catalogs={catalogs} />;
}
