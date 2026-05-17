import type { Metadata } from "next";
import NotFound from "@/views/NotFound";

export const metadata: Metadata = {
  title: "Página no encontrada",
  description:
    "La página que buscas no existe. Vuelve al catálogo o a la home para seguir descubriendo nuestra selección gourmet.",
  robots: { index: false, follow: false },
};

export default function NotFoundPage() {
  return <NotFound />;
}
