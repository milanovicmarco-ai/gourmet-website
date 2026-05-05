import type { Metadata } from "next";
import Index from "@/pages/Index";

export const metadata: Metadata = {
  title: "Aurellano Productos Gastronómicos · Distribución gourmet",
  description:
    "Distribuidor gourmet con +200 proveedores y +10.000 referencias para HORECA y tiendas. Servicio en toda Cataluña y Andorra. Pedidos por WhatsApp.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <Index />;
}
