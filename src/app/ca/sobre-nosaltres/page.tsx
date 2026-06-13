import type { Metadata } from "next";
import SobreNosotros from "@/views/SobreNosotros";

export const metadata: Metadata = {
  title: "Sobre nosaltres",
  description: "Empresa familiar gastronòmica. Tres generacions distribuint gourmet amb criteri. +200 proveïdors a tot Espanya i Andorra.",
  alternates: {
    canonical: "/ca/sobre-nosaltres",
    languages: {
      "es-ES": "/es/sobre-nosotros",
      "ca-ES": "/ca/sobre-nosaltres",
    },
  },
};

export default function SobreNosotrosPage() {
  return <SobreNosotros />;
}
