import type { Metadata } from "next";
import SobreNosotros from "@/views/SobreNosotros";

export const metadata: Metadata = {
  title: "Sobre nosotros",
  description: "Empresa familiar gastronómica. Tres generaciones distribuyendo gourmet con criterio. +200 proveedores en toda España y Andorra.",
  alternates: {
    canonical: "/es/sobre-nosotros",
    languages: {
      "es-ES": "/es/sobre-nosotros",
      "ca-ES": "/ca/sobre-nosaltres",
    },
  },
};

export default function SobreNosotrosPage() {
  return <SobreNosotros />;
}
