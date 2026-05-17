import type { Metadata } from "next";
import Condiciones from "@/views/Condiciones";

export const metadata: Metadata = {
  title: "Condiciones de venta",
  description:
    "Pedido mínimo 200€. Entrega 24-48h en Cataluña, 48-72h en resto de España y Andorra. Formas de pago, devoluciones y zonas de servicio.",
  alternates: { canonical: "/condiciones" },
};

export default function CondicionesPage() {
  return <Condiciones />;
}
