import type { Metadata } from "next";
import { listActiveInspirationCatalogs } from "@/lib/pim/inspiration";
import { InspiracionView } from "@/views/Inspiracion";

export const metadata: Metadata = {
  title: "Inspira't",
  description: "Catàlegs i dossiers en PDF d'Aurellano i les nostres marques distribuïdes. Descarrega'ls i mostra'ls al teu equip o clientela.",
  alternates: {
    canonical: "/ca/inspira-t",
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
