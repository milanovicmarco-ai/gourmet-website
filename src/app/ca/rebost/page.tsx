import type { Metadata } from "next";
import Despensa from "@/views/Despensa";

export const metadata: Metadata = {
  title: "Rebost gourmet",
  description: "Conserves premium, AOVE, vinagres, pans artesans, pasta i dolços gourmet. La base de qualsevol cuina amb criteri.",
  alternates: {
    canonical: "/ca/rebost",
    languages: {
      "es-ES": "/es/despensa",
      "ca-ES": "/ca/rebost",
    },
  },
};

export default function DespensaPage() {
  return <Despensa />;
}
