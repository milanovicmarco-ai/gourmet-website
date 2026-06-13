import type { Metadata } from "next";
import EspecialSin from "@/views/EspecialSin";

export const metadata: Metadata = {
  title: "Especial Sense",
  description: "Selecció gourmet sense gluten, sense lactosa, sense ou i vegana. Perquè la teva carta no exclogui ningú i mantingui el sabor.",
  alternates: {
    canonical: "/ca/especial-sense",
    languages: {
      "es-ES": "/es/especial-sin",
      "ca-ES": "/ca/especial-sense",
    },
  },
};

export default function EspecialSinPage() {
  return <EspecialSin />;
}
