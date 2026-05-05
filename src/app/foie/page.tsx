import type { Metadata } from "next";
import Foie from "@/pages/Foie";

export const metadata: Metadata = {
  title: "Foie y terrinas",
  description:
    "Foie mi-cuit, bloc, escalopa y nuestra apuesta inclusiva: foie vegano de anacardo. Producto premium para restauración y tienda.",
  alternates: { canonical: "/foie" },
};

export default function FoiePage() {
  return <Foie />;
}
