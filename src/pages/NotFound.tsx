"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { WHATSAPP_LINK } from "@/lib/contact";
import cheeses from "@/assets/cheeses.jpg";

const NotFound = () => {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof console !== "undefined") {
      console.warn("404 — ruta no encontrada:", pathname);
    }
  }, [pathname]);

  return (
    <Layout
      seoTitle="Página no encontrada | Aurellano P. Gastronómicos"
      seoDescription="La página que buscas no existe. Vuelve al catálogo o a la home para seguir descubriendo nuestra selección gourmet."
    >
      <section className="relative overflow-hidden">
        <Circle variant="blur" className="w-[500px] h-[500px] -top-32 -left-32 hidden md:block" />
        <Circle variant="accent" className="w-72 h-72 -bottom-20 -right-20 hidden md:block" />

        <div className="container-edit pt-12 md:pt-20 pb-20 md:pb-28 grid lg:grid-cols-12 gap-10 lg:gap-16 items-center relative">
          {/* Texto */}
          <div className="lg:col-span-6 space-y-8">
            <p className="eyebrow">Error 404</p>
            <h1 className="display text-balance">
              Esta página<br />
              <span className="italic font-light text-accent">no la tenemos en cámara.</span>
            </h1>

            <div className="space-y-5 text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
              <p>
                La URL que buscas no existe o ha cambiado de sitio. Pero seguro que hay algo
                que sí te interesa en nuestro catálogo. Échale un vistazo o escríbenos por WhatsApp
                y te orientamos.
              </p>
              <p lang="ca" className="italic text-foreground/70 border-l-2 border-accent/40 pl-4">
                La pàgina que busques no existeix o ha canviat de lloc. Segur que hi ha alguna
                cosa que sí t'interessa al nostre catàleg. Fes-hi un cop d'ull o escriu-nos per
                WhatsApp i t'orientem.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:bg-accent transition-colors group"
              >
                Volver a la home
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-2 border border-border text-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:border-foreground transition-colors"
              >
                Ver catálogo
              </Link>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent transition-colors px-2 py-4"
              >
                <MessageCircle className="h-4 w-4" /> Hablar por WhatsApp
              </a>
            </div>
          </div>

          {/* Imagen quesos */}
          <div className="lg:col-span-6 relative">
            <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden bg-secondary">
              <img
                src={cheeses}
                alt="Tabla de quesos artesanos seleccionados por Aurellano"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-primary-foreground">
                <p className="text-xs uppercase tracking-[0.18em] text-accent">Mientras tanto</p>
                <p className="font-display font-light text-2xl md:text-3xl mt-1 leading-tight">
                  Tablas de queso<br />que sí encontrarás.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default NotFound;
