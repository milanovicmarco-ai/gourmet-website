"use client";

import { MessageCircle, ArrowRight } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { SectionHeader } from "@/components/SectionHeader";
import { ProductCard } from "@/components/ProductCard";
import { waLink } from "@/lib/contact";
import type { CuratedProduct } from "@/lib/pim/featured";
import { useI18n } from "@/lib/i18n";

const cheeses = "/images/cheeses.jpg";

const origins = ["Cataluña", "Castilla", "Asturias", "País Vasco", "Francia", "Italia", "Suiza", "Holanda"];
const intensities = ["Suave", "Medio", "Intenso", "Muy intenso"];
const families = ["Vaca", "Cabra", "Oveja", "Mezclas", "Azules", "Pasta blanda", "Pasta dura", "Vegano"];

const pairings = [
  { cheese: "Manchego 12M", with: "Membrillo + tinto reserva" },
  { cheese: "Brie de Meaux", with: "Mermelada de higo + cava" },
  { cheese: "Roquefort", with: "Miel + Pedro Ximénez" },
  { cheese: "Idiazábal ahumado", with: "Pera + sidra natural" },
];

interface Props {
  /** Productos destacados del catálogo formages. */
  featured?: CuratedProduct[];
  featuredCatalogCount?: number;
}

const Quesos = ({ featured = [], featuredCatalogCount = 0 }: Props) => {
  useI18n(); // se mantiene importado para futuras strings traducibles
  return (
    <Layout
      seoTitle="Formages | Aurellano Productos Gastronómicos"
      seoDescription="Selección de quesos afinados por origen, intensidad y familia. DOP, artesanos y veganos. Maridajes y montaje de tabla a medida."
    >
      {/* HERO — pt extra para que el contenido no se solape con el nav absoluto. */}
      <section className="relative overflow-hidden bg-gradient-to-b from-accent/10 to-transparent">
        <Circle variant="blur" className="w-[500px] h-[500px] top-0 -left-40" />
        <div className="container-edit pt-32 md:pt-40 pb-12 md:pb-20 relative grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-7">
            <p className="eyebrow">afinart · selección Aurellano</p>
            <h1 className="display text-balance">
              Quesos afinados<br />
              <span className="italic font-light text-accent">como deben ser.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
              Trabajamos con maestros afinadores. Te ayudamos a montar la tabla, calcular cantidades y maridar.
            </p>
            <a href={waLink("Hola Aurellano, me interesa vuestra selección de quesos.")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:bg-accent transition-colors">
              <MessageCircle className="h-5 w-5" /> Pedir muestrario
            </a>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="aspect-square rounded-full overflow-hidden ring-accent-soft max-w-md mx-auto">
              <img src={cheeses} alt="Tabla de quesos artesanos seleccionados" className="h-full w-full object-cover" loading="lazy" />
            </div>
            <Circle variant="outline" className="w-72 h-72 top-10 -right-6 hidden md:block" />
          </div>
        </div>
      </section>

      {/* FILTROS NARRATIVOS */}
      <section className="border-y border-border bg-secondary/40">
        <div className="container-edit py-14 md:py-20 grid md:grid-cols-3 gap-12">
          <div className="space-y-3">
            <p className="eyebrow">Por origen</p>
            <ul className="flex flex-wrap gap-2">
              {origins.map((o) => (
                <li key={o} className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:border-accent transition-colors cursor-default">{o}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <p className="eyebrow">Por intensidad</p>
            <ul className="flex flex-wrap gap-2">
              {intensities.map((o) => (
                <li key={o} className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:border-accent transition-colors cursor-default">{o}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <p className="eyebrow">Por familia</p>
            <ul className="flex flex-wrap gap-2">
              {families.map((o) => (
                <li key={o} className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:border-accent transition-colors cursor-default">{o}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* DESTACADOS — productos marcados como `destacado` en el catálogo formages */}
      <section className="container-edit py-20 md:py-28">
        <SectionHeader eyebrow="Hoy en cámara" title={<>Algunos de nuestros <span className="pink-underline">imprescindibles</span>.</>} />
        {featured.length > 0 ? (
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {featured.map((p, i) => (
              <ProductCard
                key={p.ref}
                image={p.image_url ?? "/images/placeholder.svg"}
                title={p.name}
                category={p.family || "—"}
                origin={`Ref. ${p.ref}`}
                href={`/producto/${p.slug}`}
                circle={i % 2 === 0}
              />
            ))}
          </div>
        ) : (
          <EmptyHubMessage
            catalogPublishedCount={featuredCatalogCount}
            catalogName="Formages"
            flagLabel="Destacado"
          />
        )}
      </section>

      {/* MARIDAJES */}
      <section className="bg-primary text-primary-foreground relative overflow-hidden">
        <Circle variant="outline" className="w-[500px] h-[500px] -top-40 -right-40 border-primary-foreground/10" />
        <div className="container-edit py-20 md:py-28 relative grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 space-y-5">
            <p className="eyebrow text-primary-foreground/60">Maridajes</p>
            <h2 className="display-md text-balance">Lo que va<br /><span className="italic font-light text-accent">con cada queso.</span></h2>
            <p className="text-primary-foreground/70 max-w-md">Combinaciones probadas en sala. Cuéntanos tu carta de vinos y te proponemos la tabla.</p>
          </div>
          <div className="lg:col-span-7 space-y-px">
            {pairings.map((p) => (
              <div key={p.cheese} className="grid grid-cols-2 gap-6 py-5 border-t border-primary-foreground/15">
                <p className="font-display font-light text-xl md:text-2xl">{p.cheese}</p>
                <p className="text-sm md:text-base text-primary-foreground/75 self-center">{p.with}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL — gradiente blanco → rosa, mismo formato que la home. */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(322 100% 98%) 35%, hsl(322 85% 92%) 75%, hsl(322 80% 86%) 100%)",
        }}
      >
        <div className="container-edit py-24 md:py-36 text-center relative">
          <div className="relative max-w-3xl mx-auto space-y-8">
            <p className="eyebrow justify-center inline-flex text-primary/70">Empecemos</p>
            <h2 className="display text-balance text-primary">
              ¿Montamos <span className="italic font-light">tu tabla</span>?
            </h2>
            <p className="text-lg text-primary/80 max-w-xl mx-auto">
              Te asesoramos con cantidades, formatos y maridajes según tu carta. Selección curada por maestros afinadores.
            </p>
            <a
              href={waLink("Hola Aurellano, querría asesoramiento sobre quesos.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full pl-7 pr-8 py-5 font-medium hover:bg-accent transition-colors duration-300 group"
            >
              <MessageCircle className="h-5 w-5" /> Hablemos de quesos
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
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

export default Quesos;
