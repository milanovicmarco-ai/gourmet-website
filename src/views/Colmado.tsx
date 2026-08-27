"use client";

import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { SectionHeader } from "@/components/SectionHeader";
import { ProductCard } from "@/components/ProductCard";
import { ArrowRight, MessageCircle, Store } from "lucide-react";
import Link from "next/link";
import { waLink } from "@/lib/contact";
import type { CuratedProduct } from "@/lib/pim/featured";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/i18n/routes";

const colmadoImg = "/images/aurellano_productes_colmado.png";

interface Props {
  /** Productos destacados del catálogo retail. */
  featured?: CuratedProduct[];
  featuredCatalogCount?: number;
}

const Colmado = ({
  featured = [],
  featuredCatalogCount = 0,
}: Props) => {
  const { t, lang } = useI18n();
  const catalogRetailPath = `${ROUTES.catalogo[lang]}?catalog=retail`;
  return (
    <Layout
      navTheme="dark"
      heroFlush
      seoTitle="Colmado | Aurellano Productes Gastronòmics"
      seoDescription="Producto gourmet pensado para tiendas, mercados y supermercados especializados. Alta rotación, márgenes saneados y reposición ágil."
    >
      {/* HERO */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <Circle variant="outline" className="w-[600px] h-[600px] -top-40 -left-40 border-primary-foreground/10" />
        <Circle variant="blur" className="w-96 h-96 -bottom-20 right-0" />
        <div className="container-edit pt-28 md:pt-36 pb-20 md:pb-28 relative grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <p className="eyebrow text-primary-foreground/60">{t("SELECCIÓN DE VENTA AL DETALLE")}</p>
            <h1 className="display text-balance">
              {t("Colmado")}<br />
              <span className="italic font-light text-accent">{t("Gourmet.")}</span>
            </h1>
            <p className="text-lg text-primary-foreground/75 max-w-xl">
              {t("Producto pensado para tiendas, supermercados especializados, paradas de mercado y ultramarinos.")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={catalogRetailPath}
                className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:opacity-90 transition-opacity"
              >
                <Store className="h-5 w-5" /> {t("Ver catálogo para tu tienda")}
              </Link>
              <a
                href={waLink("Hola, me interesa la gama Colmado para mi tienda.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-primary-foreground/40 text-primary-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:bg-primary-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="h-5 w-5" /> {t("Hablar con comercial")}
              </a>
            </div>
          </div>
          <div className="lg:col-span-6 relative">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden">
              <img src={colmadoImg} alt="Mostrador de tienda gourmet" className="h-full w-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* SELECCIÓN destacada del catálogo retail */}
      <section className="container-edit py-20 md:py-28">
        <SectionHeader eyebrow={t("Tu coges")} title={t("Top ventas.")} />
        {featured.length > 0 ? (
          <>
            <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
              {featured.map((p) => (
                <ProductCard
                  key={p.ref}
                  image={p.image_url ?? "/images/placeholder.svg"}
                  title={p.name}
                  category={p.family || "—"}
                  origin={`Ref. ${p.ref}`}
                  href={`/producto/${p.slug}`}
                />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                href={catalogRetailPath}
                className="inline-flex items-center gap-2 border border-foreground rounded-full pl-5 pr-6 py-3 text-sm font-medium"
              >
                {t("Ver todos los productos Colmado")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        ) : (
          <EmptyHubMessage
            catalogPublishedCount={featuredCatalogCount}
            catalogName="Retail"
            flagLabel="Destacado"
          />
        )}
      </section>

    </Layout>
  );
};

/** Mensaje empty diagnóstico: distingue "catálogo sin productos" vs "sin flag". */
function EmptyHubMessage({
  catalogPublishedCount,
  catalogName,
  flagLabel,
}: {
  catalogPublishedCount: number;
  catalogName: string;
  flagLabel: string;
}) {
  return (
    <div className="mt-12 rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground space-y-2 max-w-2xl">
      {catalogPublishedCount === 0 ? (
        <>
          <p className="font-medium text-foreground">Aún no hay productos publicados en {catalogName}.</p>
          <p>
            En el PIM, abre un producto y márcalo con el catálogo &ldquo;{catalogName}&rdquo;.
            Cuando esté en estado &ldquo;Publicado&rdquo;, aparecerá aquí en cuanto le actives el flag &ldquo;{flagLabel}&rdquo;.
          </p>
        </>
      ) : (
        <>
          <p className="font-medium text-foreground">
            {catalogPublishedCount} producto{catalogPublishedCount === 1 ? "" : "s"} en {catalogName}, pero ninguno con el flag &ldquo;{flagLabel}&rdquo;.
          </p>
          <p>
            Abre un producto en el PIM, activa el toggle &ldquo;{flagLabel}&rdquo; en la sección
            &ldquo;Clasificación gastronómica&rdquo; y guarda. Si el toggle aparece atenuado, falta correr
            la migración SQL <code>20260515_product_meta_clasificacion.sql</code> en Supabase.
          </p>
        </>
      )}
    </div>
  );
}

export default Colmado;
