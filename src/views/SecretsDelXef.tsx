"use client";

import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { SectionHeader } from "@/components/SectionHeader";
import { ProductCard } from "@/components/ProductCard";
import { ArrowRight, MessageCircle, ChefHat } from "lucide-react";
import Link from "next/link";
import { waLink } from "@/lib/contact";
import type { CuratedProduct } from "@/lib/pim/featured";
import { useT } from "@/lib/i18n";

const xef = "/images/xef.jpg";

interface Props {
  /** Productos destacados del catálogo HORECA. */
  featured?: CuratedProduct[];
  /** Total de productos publicados en el catálogo HORECA (para diagnóstico de vacío). */
  featuredCatalogCount?: number;
  /** Productos "primer precio" del catálogo HORECA (entry-level con margen). */
  primerPrecio?: CuratedProduct[];
  primerPrecioCatalogCount?: number;
}

const SecretsDelXef = ({
  featured = [],
  featuredCatalogCount = 0,
  primerPrecio = [],
  primerPrecioCatalogCount = 0,
}: Props) => {
  const t = useT();
  return (
    <Layout
      navTheme="dark"
      heroFlush
      seoTitle="Secrets du Xef | Aurellano Productes Gastronòmics"
      seoDescription="4ª y 5ª gama para hostelería: platos preparados de autor e ingredientes diferenciales que ahorran tiempo sin renunciar al criterio."
    >
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <Circle variant="outline" className="w-[600px] h-[600px] -top-40 -left-40 border-primary-foreground/10" />
        <Circle variant="blur" className="w-96 h-96 -bottom-20 right-0" />
        <div className="container-edit pt-28 md:pt-36 pb-20 md:pb-28 relative grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <p className="eyebrow text-primary-foreground/60">{t("Para hostelería")}</p>
            <h1 className="display text-balance">{t("Secrets")}<br /><span className="italic font-light text-accent">{t("du Xef.")}</span></h1>
            <p className="text-lg text-primary-foreground/75 max-w-xl">{t("Producto pensado para servicio. 4ª y 5ª gama, platos preparados de autor, ingredientes diferenciales que ahorran tiempo sin renunciar al criterio.")}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/catalogo?catalog=horeca" className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:opacity-90 transition-opacity">
                <ChefHat className="h-5 w-5" /> {t("Catálogo para tu negocio")}
              </Link>
              <a href={waLink("Hola, me interesa la gama Secrets du Xef.")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-primary-foreground/40 text-primary-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:bg-primary-foreground hover:text-primary transition-colors">
                <MessageCircle className="h-5 w-5" /> {t("Hablar con comercial")}
              </a>
            </div>
          </div>
          <div className="lg:col-span-6 relative">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden">
              <img src={xef} alt="Chef emplatando en restaurante" className="h-full w-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      <section className="container-edit py-20 md:py-28">
        <SectionHeader eyebrow={t("Beneficios para tu cocina")} title={<>{t("Tiempo, criterio y")} <span className="pink-underline">{t("consistencia")}</span>.</>} />
        <div className="mt-12 grid md:grid-cols-3 gap-8">
          {[
            { title: "Sin merma", desc: "Porcionado y formato pensado para servicio. Aprovecha el 100%." },
            { title: "Calidad uniforme", desc: "Misma receta plato a plato. Tu cliente repite porque sabe a lo de siempre." },
            { title: "Tu carta, tu autoría", desc: "Te damos la base. Tú añades la firma. Nadie sabrá que no es 100% de la casa." },
          ].map((b, i) => (
            <div key={b.title} className="border-t border-border pt-8 space-y-3">
              <span className="text-xs text-muted-foreground">0{i + 1}</span>
              <h3 className="font-display font-light text-2xl">{t(b.title)}</h3>
              <p className="text-sm text-muted-foreground">{t(b.desc)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Selección destacada del catálogo HORECA */}
      <CuratedGrid
        eyebrow={t("Selección")}
        title={t("Lo que está saliendo de cocina.")}
        products={featured}
        catalogPublishedCount={featuredCatalogCount}
        catalogName="HORECA"
        flagLabel="Destacado"
        viewAllHref="/catalogo?catalog=horeca"
        viewAllLabel={t("Ver todos los productos HORECA")}
      />

      {/* Primer precio — siempre visible, con mensaje si está vacío */}
      <section className="bg-accent/5 border-y border-border">
        <div className="container-edit py-20 md:py-28">
          <SectionHeader
            eyebrow={t("Primer precio")}
            title={<>{t("Margen para tu negocio,")} <span className="pink-underline">{t("precio para tu carta")}</span>.</>}
            subtitle={t("Una selección de productos económicos y de alta rotación para escalar márgenes sin perder criterio.")}
          />
          {primerPrecio.length > 0 ? (
            <>
              <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                {primerPrecio.map((p) => (
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
                  href="/catalogo?catalog=horeca&especialidad=primer_precio"
                  className="inline-flex items-center gap-2 border border-foreground rounded-full pl-5 pr-6 py-3 text-sm font-medium"
                >
                  {t("Ver todos los primer precio HORECA")} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          ) : (
            <EmptyHubMessage
              catalogPublishedCount={primerPrecioCatalogCount}
              catalogName="HORECA"
              flagLabel="Primer precio"
            />
          )}
        </div>
      </section>
    </Layout>
  );
};

/** Sección compartida para "Selección destacada". Mensaje empty distingue entre
 *  "no hay productos en el catálogo" y "hay productos pero ninguno con el flag". */
function CuratedGrid({
  eyebrow,
  title,
  products,
  catalogPublishedCount,
  catalogName,
  flagLabel,
  viewAllHref,
  viewAllLabel,
}: {
  eyebrow: string;
  title: string;
  products: CuratedProduct[];
  catalogPublishedCount: number;
  catalogName: string;
  flagLabel: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}) {
  return (
    <section className="container-edit pb-24 md:pb-32">
      <SectionHeader eyebrow={eyebrow} title={title} />
      {products.length > 0 ? (
        <>
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {products.map((p) => (
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
          {viewAllHref && viewAllLabel && (
            <div className="mt-10 text-center">
              <Link
                href={viewAllHref}
                className="inline-flex items-center gap-2 border border-foreground rounded-full pl-5 pr-6 py-3 text-sm font-medium"
              >
                {viewAllLabel} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </>
      ) : (
        <EmptyHubMessage
          catalogPublishedCount={catalogPublishedCount}
          catalogName={catalogName}
          flagLabel={flagLabel}
        />
      )}
    </section>
  );
}

/** Mensaje empty con diagnóstico: distingue "catálogo sin productos" vs "productos
 *  en catálogo pero sin el flag" — Marco sabe qué acción tomar en el PIM. */
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

export default SecretsDelXef;
