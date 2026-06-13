import type { Metadata } from "next";
import Contacto from "@/views/Contacto";

export const metadata: Metadata = {
  title: "Contacte",
  description: "WhatsApp +34 621 181 160, telèfon 973 248 266 i email hola@aurellano.com. Dll-Div 8:00-18:00. Carrer de les Valls d'Andorra 52, 25005 Lleida.",
  alternates: {
    canonical: "/ca/contacte",
    languages: {
      "es-ES": "/es/contacto",
      "ca-ES": "/ca/contacte",
    },
  },
};

export default function ContactoPage() {
  return <Contacto />;
}
