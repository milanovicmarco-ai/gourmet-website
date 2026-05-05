import type { Metadata } from "next";
import Despensa from "@/pages/Despensa";

export const metadata: Metadata = {
  title: "Despensa gourmet",
  description:
    "Conservas premium, AOVE, vinagres, panes artesanos, pasta y dulces gourmet. La base de cualquier cocina con criterio.",
  alternates: { canonical: "/despensa" },
};

export default function DespensaPage() {
  return <Despensa />;
}
