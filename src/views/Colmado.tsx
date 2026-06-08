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

const colmadoImg = "/images/colmado.jpg";

interface Props {
  /** Productos destacados del catálogo retail. */
  featured?: CuratedProduct[];
  featuredCatalogCount?: number;
  /** Productos "primer precio" del catálogo retail. */
  primerPrecio?: CuratedProduct[];
  primerPrecioCatalogCount?: number;
}

const Colmado = ({
  featured = [],
  featuredCatalogCount = 0,
  primerPrecio = [],
  primerPrecioCatalogCount = 0,
}: Props) => {
  // useI18n se importa pero ya no se usa con texto inline — se queda por si añadimos copy traducido.
  useI18n();
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
            <p className="eyebrow text-primary-foreground/60">Para tiendas y mercados</p>
            <h1 className="display text-balance">
              Colmado<br />
              <span className="italic font-light text-accent">Gourmet.</span>
            </h1>
            <p className="text-lg text-primary-foreground/75 max-w-xl">
              Producto gourmet pensado para tiendas, supermercados especializados, paradas de mercado y
              ultramarinos. Alta rotación, márgenes saneados y un surtido que diferencia tu lineal.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/catalogo?catalog=retail"
                className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:opacity-90 transition-opacity"
              >
                <Store className="h-5 w-5" /> Ver catálogo para tu tienda
              </Link>
              <a
                href={waLink("Hola, me interesa la gama Colmado para mi tienda.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-primary-foreground/40 text-primary-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:bg-primary-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="h-5 w-5" /> Hablar con comercial
              </a>
            </div>
          </div>
          <div className="lg:col-span-6 relative">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden">
              <img src={colmadoImg} alt="Mostrador de tienda gourmet" className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-center p-4 shadow-glow">
              <span className="text-xs font-medium leading-tight">surtido<br />para vender</span>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="container-edit py-20 md:py-28">
        <SectionHeader
          eyebrow="Beneficios para tu tienda"
          title={<>Margen, rotación y <span className="pink-underline">diferenciación</span>.</>}
        />
        <div className="mt-12 grid md:grid-cols-3 gap-8">
          {[
            { t: "Surtido curado", d: "Selección que escapa del lineal genérico. Tu clientela viene a buscarte por lo que solo tienes tú." },
            { t: "Formato retail", d: "Etiquetado preparado para tienda, formatos que rotan y precio cerrado por unidad." },
            { t: "Reposición ágil", d: "Pedidos pequeños sin penalización. Repones cuando lo necesitas, no cuando toca." },
          ].map((b, i) => (
            <div key={b.t} className="border-t border-border pt-8 space-y-3">
              <span className="text-xs text-muted-foreground">0{i + 1}</span>
              <h3 className="font-display font-light text-2xl">{b.t}</h3>
              <p className="text-sm text-muted-foreground">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SELECCIÓN destacada del catálogo retail */}
      <section className="container-edit pb-20 md:pb-28">
        <SectionHeader eyebrow="Selección retail" title="Lo que está volando del lineal." />
        {featured.length > 0 ? (
          <>
            <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
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
                href="/catalogo?catalog=retail"
                className="inline-flex items-center gap-2 border border-foreground rounded-full pl-5 pr-6 py-3 text-sm font-medium"
              >
                Ver todos los productos Colmado <ArrowRight className="h-4 w-4" />
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

      {/* Primer precio — siempre visible con mensaje empty si no hay */}
      <section className="bg-accent/5 border-y border-border">
        <div className="container-edit py-20 md:py-28">
          <SectionHeader
            eyebrow="Primer precio"
            title={<>Económicos para tu lineal, <span className="pink-underline">margen para tu tienda</span>.</>}
            subtitle="Productos de alta rotación con precio entry-level y buen margen para escalar volumen."
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
                  href="/catalogo?catalog=retail&especialidad=primer_precio"
                  className="inline-flex items-center gap-2 border border-foreground rounded-full pl-5 pr-6 py-3 text-sm font-medium"
                >
                  Ver todos los primer precio Retail <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          ) : (
            <EmptyHubMessage
              catalogPublishedCount={primerPrecioCatalogCount}
              catalogName="Retail"
              flagLabel="Primer precio"
            />
          )}
        </div>
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
