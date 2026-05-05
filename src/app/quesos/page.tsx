import type { Metadata } from "next";
import Quesos from "@/pages/Quesos";

export const metadata: Metadata = {
  title: "Quesos afinados",
  description:
    "Selección de quesos afinados por origen, intensidad y familia. DOP, artesanos y veganos. Maridajes y montaje de tabla a medida.",
  alternates: { canonical: "/quesos" },
};

export default function QuesosPage() {
  return <Quesos />;
}
