import type { Metadata } from "next";
import Colmado from "@/pages/Colmado";

export const metadata: Metadata = {
  title: "Colmado",
  description:
    "Producto gourmet pensado para tiendas, mercados y supermercados especializados. Alta rotación, márgenes saneados y reposición ágil.",
  alternates: { canonical: "/colmado" },
};

export default function ColmadoPage() {
  return <Colmado />;
}
