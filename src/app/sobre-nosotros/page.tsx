import type { Metadata } from "next";
import SobreNosotros from "@/pages/SobreNosotros";

export const metadata: Metadata = {
  title: "Sobre nosotros",
  description:
    "Empresa familiar gastronómica. Tres generaciones distribuyendo gourmet con criterio. +200 proveedores en toda España y Andorra.",
  alternates: { canonical: "/sobre-nosotros" },
};

export default function SobreNosotrosPage() {
  return <SobreNosotros />;
}
