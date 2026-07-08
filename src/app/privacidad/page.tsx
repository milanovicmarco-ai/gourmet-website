import type { Metadata } from "next";
import Privacidad from "@/views/Privacidad";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description:
    "Cómo tratamos tus datos personales: responsable, finalidad, legitimación, derechos y conservación.",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacidadPage() {
  return <Privacidad />;
}
