import type { Metadata } from "next";
import { Suspense } from "react";
import Catalogo from "@/pages/Catalogo";

export const metadata: Metadata = {
  title: "Catálogo gourmet",
  description:
    "Filtra +10.000 referencias gourmet por tipo de cliente, categoría, alérgeno o precio. Quesos, foie, conservas, despensa y línea Especial Sin.",
  alternates: { canonical: "/catalogo" },
};

export default function CatalogoPage() {
  return (
    <Suspense fallback={null}>
      <Catalogo />
    </Suspense>
  );
}
