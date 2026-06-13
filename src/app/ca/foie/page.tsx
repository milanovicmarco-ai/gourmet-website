import type { Metadata } from "next";
import Foie from "@/views/Foie";

export const metadata: Metadata = {
  title: "Foie i terrines",
  description: "Foie mi-cuit, bloc, escalopa i la nostra aposta inclusiva: foie vegà d'anacard. Producte premium per a restauració i botiga.",
  alternates: {
    canonical: "/ca/foie",
    languages: {
      "es-ES": "/es/foie",
      "ca-ES": "/ca/foie",
    },
  },
};

export default function FoiePage() {
  return <Foie />;
}
