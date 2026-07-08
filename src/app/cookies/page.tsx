import type { Metadata } from "next";
import Cookies from "@/views/Cookies";

export const metadata: Metadata = {
  title: "Política de Cookies",
  description: "Qué cookies utiliza aurellano.com, con qué finalidad y cómo puedes gestionarlas.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return <Cookies />;
}
