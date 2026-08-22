"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, ChefHat, Store, Truck, Sparkles, Lightbulb } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { SectionHeader } from "@/components/SectionHeader";
import { ProductCard } from "@/components/ProductCard";
import { WHATSAPP_LINK } from "@/lib/contact";
import { useI18n } from "@/lib/i18n";

/** Shape mínimo que pasa el server component (page.tsx) para la sección
 * "Nuestro catálogo" — provienen del catálogo `seleccion-aurellano` (Supabase). */
export type FeaturedProduct = {
  ref: string;
  slug: string;
  name: string;
  family: string;
  image_url: string | null;
};
const heroFoie = "/images/Restaurant_productes_gastronomics_aurellano.jpg";
const cheeses = "/images/cheeses.jpg";
const quesoDetalle = "/images/queso-detalle.jpg";
const xef = "/images/xef.jpg";
const colmado = "/images/colmado.jpg";
const aniversari = "/images/aniversari.png";
const especialidadDelicatessen = "/images/especialidad-delicatessen.jpg";
const especialidadHealthy = "/images/especialidad-healthy.jpg";
const especialidadLimited = "/images/limited-bialetti.png";

interface IndexProps {
  /** Productos destacados de "Selección Aurellano" (vienen del server component). */
  featured?: FeaturedProduct[];
}

const Index = ({ featured = [] }: IndexProps) => {
  const { t } = useI18n();

  return (
    <Layout
      navTheme="dark"
      heroFlush
      seoTitle="Aurellano Productes Gastronòmics · Tu partner gastronómico de confianza"
      seoDescription="Especialistas en distribución de productos gourmet para restaurantes, hoteles y tiendas especializadas."
    >
      {/* ========== HERO FULL-SCREEN ========== */}
      <section className="relative h-screen min-h-[640px] w-full overflow-hidden">
        <img
          src={heroFoie}
          alt="Foie premium emplatado en restaurante"
          className="absolute inset-0 h-full w-full object-cover"
          width={1920}
          height={1280}
        />
        <div className="absolute inset-0" style={{ background: "var(--hero-overlay)" }} />
        <div className="absolute inset-0 bg-primary/30" />

        <div className="relative h-full container-edit flex flex-col justify-end pb-16 md:pb-24 pt-24">
          <div className="max-w-3xl space-y-7 animate-fade-up text-primary-foreground">
            <p className="eyebrow text-primary-foreground/70">Aurellano Productes Gastronòmics</p>
            <h1 className="display text-balance text-primary-foreground">
              {t("Tu partner")}<br />
              <span className="italic font-light text-accent">{t("gastronómico")}</span><br />
              <span className="italic font-light text-primary-foreground">{t("de confianza")}</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/85 max-w-xl text-pretty leading-relaxed">
              {t("Especialistas en distribución de productos gourmet para restaurantes, hoteles y tiendas especializadas.")}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:bg-primary-foreground hover:text-primary transition-colors duration-300 group"
              >
                <MessageCircle className="h-5 w-5" />
                {t("Pedidos por WhatsApp")}
                <ArrowRight className="h-4 w-4 -ml-1 transition-transform group-hover:translate-x-1" />
              </a>
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-2 border border-primary-foreground/40 text-primary-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:bg-primary-foreground hover:text-primary transition-colors"
              >
                {t("Ver catálogo")}
              </Link>
            </div>
          </div>

          {/* Aniversari badge — estático */}
          <img
            src={aniversari}
            alt="50 aniversari Aurellano"
            className="absolute bottom-8 right-6 md:bottom-12 md:right-12 h-28 w-28 md:h-40 md:w-40 object-contain"
          />
        </div>
      </section>

      {/* ========== TRUST STRIP ========== */}
      <section className="border-y border-border bg-secondary/40">
        <div className="container-edit py-10 md:py-14 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { k: "+50", l: t("años de experiencia") },
            { k: "+200", l: t("proveedores") },
            { k: "+10.000", l: t("referencias") },
            { k: "1968", l: t("tradición familiar") },
          ].map((s) => (
            <div key={s.l} className="space-y-1">
              <p className="font-display font-light text-4xl md:text-5xl">{s.k}</p>
              <p className="text-xs md:text-sm uppercase tracking-[0.18em] text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== SEGMENTACIÓN ========== */}
      <section className="container-edit py-20 md:py-32 relative">
        <SectionHeader
          eyebrow={t("Tus partners")}
          title={<>{t("Productos adaptados a")} <span className="pink-underline">{t("tus necesidades")}</span>.</>}
        />

        <div className="mt-14 grid md:grid-cols-2 gap-6 lg:gap-10">
          <Link href="/secrets-du-xef" className="group relative overflow-hidden rounded-3xl bg-primary text-primary-foreground p-8 md:p-12 min-h-[420px] flex flex-col justify-between hover-lift">
            <img src={xef} alt="Chef emplatando" className="absolute inset-0 h-full w-full object-cover opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-[1200ms]" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/70 to-primary/20" />
            <Circle variant="outline" className="w-72 h-72 -top-20 -right-20 border-primary-foreground/10" />
            <div className="relative">
              <ChefHat className="h-7 w-7 text-accent mb-4" />
              <p className="eyebrow text-primary-foreground/60">{t("HORECA")}</p>
            </div>
            <div className="relative space-y-4">
              <h3 className="font-display font-light text-3xl md:text-5xl tracking-tight">{t("Secrets du Xef")}</h3>
              <p className="text-primary-foreground/75 max-w-md">{t("Producto pensado para hostelería: 4ª y 5ª gama, platos preparados, ingredientes de autor.")}</p>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-accent">{t("Ver catálogo")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </div>
          </Link>

          <Link href="/catalogo" className="group relative overflow-hidden rounded-3xl bg-secondary p-8 md:p-12 min-h-[420px] flex flex-col justify-between hover-lift">
            <img src={colmado} alt="Mostrador de tienda gourmet" className="absolute inset-0 h-full w-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-[1200ms]" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/10" />
            <Circle variant="accent" className="w-56 h-56 -bottom-20 -right-20" />
            <div className="relative">
              <Store className="h-7 w-7 text-accent mb-4" />
              <p className="eyebrow">{t("Establecimientos")}</p>
            </div>
            <div className="relative space-y-4">
              <h3 className="font-display font-light text-3xl md:text-5xl tracking-tight">{t("Colmado")}</h3>
              <p className="text-muted-foreground max-w-md">{t("Productos seleccionados para tiendas; lo que tu cliente busca y aún no sabe.")}</p>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">{t("Ver catálogo")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </div>
          </Link>
        </div>
      </section>

      {/* ========== QUÉ OFRECE ========== */}
      <section className="bg-primary text-primary-foreground relative overflow-hidden">
        <Circle variant="outline" className="w-[600px] h-[600px] -top-40 -left-40 border-primary-foreground/10" />
        <Circle variant="blur" className="w-96 h-96 -bottom-20 right-0" />

        <div className="container-edit relative py-20 md:py-32">
          <div className="max-w-3xl space-y-4">
            <p className="eyebrow text-primary-foreground/60">{t("Qué ofrecemos")}</p>
            <h2 className="display-md text-balance">{t("Más que un proveedor.")}<br />{t("Tu")}<span className="text-accent italic font-light">{t("partner.")}</span></h2>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-8 lg:gap-14">
            {[
              { icon: Truck, title: t("Distribución"), desc: t("Logística propia. Entregas en 24–48h en Cataluña y 48–72h en el resto de España y Andorra.") },
              { icon: Sparkles, title: t("Asesoramiento"), desc: t("Conocemos producto, mercado y temporada. Te ayudamos a elegir, ahorrar y diferenciarte.") },
              { icon: Lightbulb, title: t("Inspiración"), desc: t("Ideas para tu carta o tienda: combinaciones, novedades, propuestas para cada estación.") },
            ].map((f, i) => (
              <div key={f.title} className="space-y-4 pt-8 border-t border-primary-foreground/15">
                <div className="flex items-center justify-between">
                  <f.icon className="h-7 w-7 text-accent" strokeWidth={1.5} />
                  <span className="text-xs text-primary-foreground/40">0{i + 1}</span>
                </div>
                <h3 className="font-display font-light text-2xl md:text-3xl tracking-tight">{f.title}</h3>
                <p className="text-primary-foreground/70 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== ZONAS DE SERVICIO (oculta temporalmente) ========== */}
      {false && (
        <section className="container-edit py-20 md:py-28">
          <SectionHeader
            align="center"
            eyebrow={t("Donde servimos")}
            title={<>{t("Cataluña")} <span className="pink-underline">{t("y Andorra")}</span>.</>}
            subtitle={t("Logística propia con entrega 24-48h en Cataluña y 48-72h en Andorra. Cobertura completa para HORECA y comercio especializado.")}
          />
          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-5">
            {[
              { city: "Barcelona", note: "Restauración y comercio gourmet" },
              { city: "Girona", note: "Costa Brava y Empordà" },
              { city: "Lleida", note: "Sede central y logística" },
              { city: "Tarragona", note: "HORECA y comercio" },
              { city: "Andorra", note: "Servicio al Principat" },
            ].map((z) => (
              <div
                key={z.city}
                className="group rounded-2xl border border-border bg-secondary/30 p-5 md:p-6 transition-colors hover:border-accent hover:bg-secondary/60"
              >
                <p className="font-display font-light text-2xl md:text-3xl tracking-tight">{t(z.city)}</p>
                <p className="text-xs md:text-sm text-muted-foreground mt-1.5 leading-relaxed">{t(z.note)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========== BLOQUES PRODUCTO ========== */}
      <section className="container-edit py-20 md:py-32">
        <div className="mb-14">
          <SectionHeader
            eyebrow={t("Nuestro catálogo")}
            title={<>{t("Lo que nos")} <span className="pink-underline">{t("apasiona")}</span>.</>}
          />
        </div>

        {featured.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
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
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("Asigna productos al catálogo \"Selección Aurellano\" desde el PIM para que aparezcan aquí.")}
          </p>
        )}
      </section>

      {/* ========== ESPECIALIZACIÓN: QUESOS — FULL BLEED ========== */}
      <section className="relative min-h-[700px] md:min-h-[820px] flex items-center overflow-hidden">
        <img
          src={cheeses}
          alt="Tabla de quesos artesanos"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="container-edit relative py-24 md:py-36 text-primary-foreground">
          <div className="max-w-2xl space-y-7">
            <p className="eyebrow text-accent">{t("Especialidad de la casa")}</p>
            <h2 className="font-display font-light leading-[1.02] tracking-tight text-5xl md:text-7xl text-balance">
              {t("Quesos afinados")}<br />
              <span className="italic text-accent">{t("con criterio.")}</span>
            </h2>
            <p className="text-lg md:text-xl text-primary-foreground/85 leading-relaxed max-w-xl">
              {t("Trabajamos directo con maestros afinadores. Por origen, intensidad y maduración. Te ayudamos a montar la tabla perfecta — y a maridarla.")}
            </p>
            <Link
              href="/quesos"
              className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:bg-primary-foreground hover:text-primary transition-colors"
            >
              {t("Explorar quesos")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========== ESPECIALIDADES: 3 CARDS ========== */}
      <section className="container-edit py-20 md:py-32">
        <SectionHeader
          align="center"
          eyebrow={t("Productos únicos")}
          title={<>{t("3 mundos, un mismo")} <span className="pink-underline">{t("criterio")}</span>.</>}
          subtitle={t("Selecciones temáticas pensadas para diferenciarte.")}
        />

        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {[
            {
              tag: t("Delicatessen"),
              desc: t("Iconos del gusto: foie, quesos afinados, anchoas, vermut. Lo que un paladar exigente reconoce al primer bocado."),
              img: especialidadDelicatessen,
              to: "/catalogo?catalog=delicatessen",
            },
            {
              tag: t("Healthy"),
              desc: t("Vegano, sin gluten, sin lactosa, fermentados. Bienestar real con sabor de verdad."),
              img: especialidadHealthy,
              to: "/catalogo?catalog=healthy",
            },
            {
              tag: t("Limited Edition"),
              desc: t("Producciones cortas, importaciones puntuales, ediciones numeradas. Lo que está hoy, mañana puede no estar."),
              img: especialidadLimited,
              to: "/catalogo?catalog=limited-edition",
            },
          ].map((i) => (
            <Link
              key={i.tag}
              href={i.to}
              // container-type: la tipografía del título se calcula sobre el ancho
              // de la tarjeta para que quepa siempre en una sola línea.
              style={{ containerType: "inline-size" }}
              className="group relative overflow-hidden rounded-3xl bg-secondary aspect-[4/5] hover-lift block"
            >
              <img
                src={i.img}
                alt={i.tag}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/50 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7 text-primary-foreground space-y-3">
                {/* 7.5 ≈ ratio ancho/tamaño de la cadena más larga ("Limited Edition")
                 * en Montserrat Light; garantiza una línea sin desbordar el padding. */}
                <h3
                  className="font-display font-light leading-tight text-accent whitespace-nowrap"
                  style={{ fontSize: "clamp(1.25rem, calc((100cqw - 3.5rem) / 7.5), 3rem)" }}
                >
                  {i.tag}
                </h3>
                {/* Altura fija de 3 líneas → título, párrafo y CTA quedan a la misma
                 * altura en las tres tarjetas (el bloque está anclado abajo). */}
                <p className="text-sm text-primary-foreground/80 line-clamp-3 min-h-[3.75rem]">{i.desc}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium pt-1">
                  {t("Ver catálogo")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ========== CTA FINAL — blanco arriba → rosa abajo ========== */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(322 100% 98%) 35%, hsl(322 85% 92%) 75%, hsl(322 80% 86%) 100%)",
        }}
      >
        <div className="container-edit py-24 md:py-36 text-center relative">
          <div className="relative max-w-3xl mx-auto space-y-8">
            <p className="eyebrow justify-center inline-flex text-primary/70">{t("Empecemos")}</p>
            <h2 className="display text-balance text-primary">
              {t("¿Hablamos de")} <span className="italic font-light">{t("tu carta")}</span>?
            </h2>
            <p className="text-lg text-primary/80 max-w-xl mx-auto">
              {t("Cuéntanos qué necesitas. Te respondemos en breve con propuesta, precios y muestras si hace falta.")}
            </p>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full pl-7 pr-8 py-5 font-medium hover:bg-accent transition-colors duration-300 group"
            >
              <MessageCircle className="h-5 w-5" /> {t("Escribir por WhatsApp")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
