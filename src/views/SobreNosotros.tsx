"use client";

import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { SectionHeader } from "@/components/SectionHeader";
const empresa = "/images/empresa.jpg";
import { MessageCircle, ArrowRight } from "lucide-react";
import { WHATSAPP_LINK } from "@/lib/contact";
<<<<<<< HEAD
import { useT } from "@/lib/i18n";
=======
import { useI18n } from "@/lib/i18n";
>>>>>>> f1b77cf (Publish-gate: solo nombre + ref + imagen obligatorios)

const milestones = [
  { year: "1968", title: "Empieza la historia", desc: "Fundación en Lleida como pequeño distribuidor de producto local." },
  { year: "1985", title: "El salto al gourmet", desc: "Apuesta por producto de importación y denominaciones de origen." },
  { year: "2005", title: "Profesionalización", desc: "Logística propia, almacén refrigerado y red de transporte." },
  { year: "Hoy", title: "+10.000 referencias", desc: "Empresa familiar profesionalizada, +200 proveedores y servicio en toda España y Andorra." },
];

const SobreNosotros = () => {
<<<<<<< HEAD
  const t = useT();
=======
  const { t } = useI18n();
>>>>>>> f1b77cf (Publish-gate: solo nombre + ref + imagen obligatorios)
  const imgRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      if (!imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      // Progreso de -1 (debajo) a 1 (arriba)
      const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
      setOffset(progress * -40); // hasta 40px de desplazamiento
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
  <Layout
    seoTitle="Sobre nosotros | Aurellano Productes Gastronòmics"
    seoDescription="Empresa familiar gastronómica. Tres generaciones distribuyendo gourmet con criterio. +200 proveedores en toda España y Andorra."
  >
    <section className="relative overflow-hidden">
      <Circle variant="accent" className="w-72 h-72 -top-10 -right-20" />
      <div className="container-edit pt-32 md:pt-40 pb-12 md:pb-16 max-w-4xl space-y-6 relative">
        <p className="eyebrow">{t("Sobre nosotros")}</p>
        <h1 className="display text-balance">{t("+50 años seleccionando")}<br /><span className="italic font-light text-accent">{t("producto con criterio.")}</span></h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">{t("Empresa familiar de Lleida. Nacimos como pequeño distribuidor y nos hemos convertido en partner gourmet de referencia para profesionales en toda España y Andorra.")}</p>
      </div>
    </section>

    {/* Parallax: la imagen queda fija respecto al viewport (background-attachment: fixed
        en desktop) mientras se hace scroll, dando la sensación de ir descubriendo
        la imagen entera por partes. En mobile el fijado se desactiva (iOS Safari
        no lo soporta bien) y caemos a un parallax suave con translateY proporcional. */}
    <section className="container-edit pb-20 md:pb-28">
      <div
        ref={imgRef}
        className="aurellano-parallax rounded-3xl overflow-hidden bg-muted h-[55vh] md:h-[70vh] min-h-[360px] relative"
      >
        {/* Desktop: bg-fixed funciona perfectamente y da el efecto exacto */}
        <div
          className="hidden md:block absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${empresa})`,
            backgroundAttachment: "fixed",
          }}
          aria-hidden
        />
        {/* Mobile: parallax JS sobre <img>. Anclada en el centro vertical para que
            si el JS falla por cualquier motivo, la imagen se vea centrada (no cortada
            por arriba o por abajo). El translateY del scroll se suma al centrado. */}
        <img
          src={empresa}
          alt="Almacén histórico Aurellano"
          className="md:hidden absolute left-0 w-full h-[130%] object-cover object-center will-change-transform"
          style={{
            top: "50%",
            transform: `translateY(calc(-50% + ${offset * 2}px))`,
          }}
          loading="lazy"
        />
      </div>
    </section>

    <section className="container-edit pb-20 md:pb-28">
      <SectionHeader eyebrow={t("Nuestra historia")} title={<>{t("De pequeño distribuidor")}<br />{t("a partner")} <span className="pink-underline">{t("de referencia")}</span>.</>} />
      <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        {milestones.map((m) => (
          <div key={m.year} className="border-t border-border pt-6 space-y-2">
<<<<<<< HEAD
            <p className="font-display font-light text-3xl text-accent">{m.year === "Hoy" ? t("Hoy") : m.year}</p>
=======
            <p className="font-display font-light text-3xl text-accent">{t(m.year)}</p>
>>>>>>> f1b77cf (Publish-gate: solo nombre + ref + imagen obligatorios)
            <h3 className="font-display font-medium text-lg">{t(m.title)}</h3>
            <p className="text-sm text-muted-foreground">{t(m.desc)}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="bg-primary text-primary-foreground relative overflow-hidden">
      <Circle variant="outline" className="w-[500px] h-[500px] -top-40 -right-40 border-primary-foreground/10" />
      <div className="container-edit py-20 md:py-28 relative grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5 space-y-5">
          <p className="eyebrow text-primary-foreground/60">{t("Cómo trabajamos")}</p>
          <h2 className="display-md text-balance">{t("Cerca de cada")}<br /><span className="italic font-light text-accent">{t("cliente.")}</span></h2>
        </div>
        <div className="lg:col-span-7 grid sm:grid-cols-2 gap-8">
          {[
            { title: "Empresa familiar", desc: "Tres generaciones. Conocemos por su nombre a los clientes que llevan décadas con nosotros." },
            { title: "Profesionalizada", desc: "Procesos, trazabilidad y logística propia. Te servimos como una multinacional, te tratamos como vecinos." },
            { title: "Visión gourmet", desc: "Buscamos lo que aún no se conoce. Visitamos productores. Probamos antes que nadie." },
            { title: "Innovación", desc: "Apostamos por producto inclusivo, sin alérgenos y formatos pensados para tu negocio." },
          ].map((b) => (
<<<<<<< HEAD
            <div key={b.t} className="space-y-2 border-t border-primary-foreground/15 pt-6">
              <h3 className="font-display font-medium text-lg">{t(b.t)}</h3>
              <p className="text-sm text-primary-foreground/70">{t(b.d)}</p>
=======
            <div key={b.title} className="space-y-2 border-t border-primary-foreground/15 pt-6">
              <h3 className="font-display font-medium text-lg">{t(b.title)}</h3>
              <p className="text-sm text-primary-foreground/70">{t(b.desc)}</p>
>>>>>>> f1b77cf (Publish-gate: solo nombre + ref + imagen obligatorios)
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
          <p className="eyebrow justify-center inline-flex text-primary/70">{t("Empecemos")}</p>
          <h2 className="display text-balance text-primary">
            {t("¿Empezamos a")} <span className="italic font-light">{t("trabajar juntos")}</span>?
          </h2>
          <p className="text-lg text-primary/80 max-w-xl mx-auto">
            {t("Cuéntanos qué necesitas para tu negocio. Te respondemos en horas con propuesta, precios y muestras si hace falta.")}
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

export default SobreNosotros;
