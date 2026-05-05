import type { Metadata } from "next";
import SecretsDelXef from "@/pages/SecretsDelXef";

export const metadata: Metadata = {
  title: "Secrets du Xef",
  description:
    "4ª y 5ª gama para hostelería: platos preparados de autor e ingredientes diferenciales que ahorran tiempo sin renunciar al criterio.",
  alternates: { canonical: "/secrets-du-xef" },
};

export default function SecretsPage() {
  return <SecretsDelXef />;
}
