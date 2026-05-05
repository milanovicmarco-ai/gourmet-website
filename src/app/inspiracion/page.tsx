import type { Metadata } from "next";
import Consejos from "@/pages/Consejos";

export const metadata: Metadata = {
  title: "Inspiración gourmet",
  description:
    "Maridajes, técnicas y conservación para profesionales. Saber gourmet aplicado a restauración y comercio especializado.",
  alternates: { canonical: "/inspiracion" },
};

export default function InspiracionPage() {
  return <Consejos />;
}
