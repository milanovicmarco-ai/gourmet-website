import type { Metadata } from "next";
import Contacto from "@/views/Contacto";

export const metadata: Metadata = {
  title: "Contacto",
  description: "WhatsApp +34 621 181 160, teléfono 973 248 266 y email hola@aurellano.com. Lun-Vie 8:00-18:00. Carrer de les Valls d'Andorra 52, 25005 Lleida.",
  alternates: {
    canonical: "/es/contacto",
    languages: {
      "es-ES": "/es/contacto",
      "ca-ES": "/ca/contacte",
    },
  },
};

export default function ContactoPage() {
  return <Contacto />;
}
