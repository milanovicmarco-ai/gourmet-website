import type { Metadata } from "next";
import { Suspense } from "react";
import { Layout } from "@/components/Layout";
import { CatalogContent, CatalogContentSkeleton, type CatalogContentSP } from "@/components/catalog/CatalogContent";

export const metadata: Metadata = {
  title: "Catálogo gourmet",
  description:
    "Filtra +10.000 referencias gourmet por familia, alérgeno o precio. Quesos, foie, conservas, despensa y línea Especial Sin.",
  alternates: {
    canonical: "/es/catalogo",
    languages: {
      "es-ES": "/es/catalogo",
      "ca-ES": "/ca/cataleg",
    },
  },
};

export const revalidate = 3600;

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<CatalogContentSP>;
}) {
  const sp = await searchParams;
  return (
    <Layout navTheme="light">
      <Suspense fallback={<CatalogContentSkeleton />}>
        <CatalogContent
          sp={sp}
          basePath="/es/catalogo"
          productHrefBase="/es/producto"
        />
      </Suspense>
    </Layout>
  );
}
