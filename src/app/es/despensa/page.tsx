import type { Metadata } from "next";
import Despensa from "@/views/Despensa";

export const metadata: Metadata = {
  title: "Despensa gourmet",
  description: "Conservas premium, AOVE, vinagres, panes artesanos, pasta y dulces gourmet. La base de cualquier cocina con criterio.",
  alternates: {
    canonical: "/es/despensa",
    languages: {
      "es-ES": "/es/despensa",
      "ca-ES": "/ca/rebost",
    },
  },
};

export default function DespensaPage() {
  return <Despensa />;
}
