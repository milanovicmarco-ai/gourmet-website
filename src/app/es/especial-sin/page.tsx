import type { Metadata } from "next";
import EspecialSin from "@/views/EspecialSin";

export const metadata: Metadata = {
  title: "Especial Sin",
  description: "Selección gourmet sin gluten, sin lactosa, sin huevo y vegana. Para que tu carta no excluya a nadie y mantenga el sabor.",
  alternates: {
    canonical: "/es/especial-sin",
    languages: {
      "es-ES": "/es/especial-sin",
      "ca-ES": "/ca/especial-sense",
    },
  },
};

export default function EspecialSinPage() {
  return <EspecialSin />;
}
