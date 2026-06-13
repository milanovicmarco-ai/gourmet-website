import type { Metadata } from "next";
import { listActiveInspirationCatalogs } from "@/lib/pim/inspiration";
import { InspiracionView } from "@/views/Inspiracion";

export const metadata: Metadata = {
  title: "Inspírate",
  description: "Catálogos y dossieres en PDF de Aurellano y nuestras marcas distribuidas. Descárgalos y enséñalos a tu equipo o clientela.",
  alternates: {
    canonical: "/es/inspirate",
    languages: {
      "es-ES": "/es/inspirate",
      "ca-ES": "/ca/inspira-t",
    },
  },
};

// Revalida cada 1 hora; los Server Actions de inspiration hacen revalidatePath
// al subir/editar/borrar catálogos PDF así que los cambios se reflejan al momento.
export const revalidate = 3600;

export default async function InspiracionPage() {
  const catalogs = await listActiveInspirationCatalogs();
  return <InspiracionView catalogs={catalogs} />;
}
