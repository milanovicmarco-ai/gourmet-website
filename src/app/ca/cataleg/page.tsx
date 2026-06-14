import type { Metadata } from "next";
import { Suspense } from "react";
import { Layout } from "@/components/Layout";
import { CatalogContent, CatalogContentSkeleton, type CatalogContentSP } from "@/components/catalog/CatalogContent";

export const metadata: Metadata = {
  title: "Catàleg gourmet",
  description:
    "Filtra +10.000 referències gourmet per família, al·lèrgens o preu. Formatges, foie, conserves, rebost i línia Especial Sense.",
  alternates: {
    canonical: "/ca/cataleg",
    languages: {
      "es-ES": "/es/catalogo",
      "ca-ES": "/ca/cataleg",
    },
  },
};

export const revalidate = 3600;

export default async function CatalegPage({
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
          basePath="/ca/cataleg"
          productHrefBase="/ca/producte"
          lang="ca"
        />
      </Suspense>
    </Layout>
  );
}
