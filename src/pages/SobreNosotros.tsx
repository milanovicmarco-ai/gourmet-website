"use client";

import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { SectionHeader } from "@/components/SectionHeader";
const empresa = "/images/empresa.jpg";
import { MessageCircle } from "lucide-react";
import { WHATSAPP_LINK } from "@/lib/contact";

const milestones = [
  { year: "1968", title: "Empieza la historia", desc: "Fundación en Lleida como pequeño distribuidor de producto local." },
  { year: "1985", title: "El salto al gourmet", desc: "Apuesta por producto de importación y denominaciones de origen." },
  { year: "2005", title: "Profesionalización", desc: "Logística propia, almacén refrigerado y red de transporte." },
  { year: "Hoy", title: "+10.000 referencias", desc: "Empresa familiar profesionalizada, +200 proveedores y servicio en toda España y Andorra." },
];

const SobreNosotros = () => {
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
    seoTitle="Sobre nosotros | Aurellano Productos Gastronómicos"
    seoDescription="Empresa familiar gastronómica. Tres generaciones distribuyendo gourmet con criterio. +200 proveedores en toda España y Andorra."
  >
    <section className="relative overflow-hidden">
      <Circle variant="accent" className="w-72 h-72 -top-10 -right-20" />
      <div className="container-edit pt-12 md:pt-20 pb-12 md:pb-16 max-w-4xl space-y-6 relative">
        <p className="eyebrow">Sobre nosotros</p>
        <h1 className="display text-balance">+50 años seleccionando<br /><span className="italic font-light text-accent">producto con criterio.</span></h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">Empresa familiar de Lleida. Nacimos como pequeño distribuidor y nos hemos convertido en partner gourmet de referencia para profesionales en toda España y Andorra.</p>
      </div>
    </section>

    <section className="container-edit pb-20 md:pb-28">
      <div ref={imgRef} className="rounded-3xl overflow-hidden bg-muted aspect-[16/9] md:aspect-[16/8]">
        <img
          src={empresa}
          alt="Almacén histórico Aurellano"
          className="w-full h-[115%] object-cover will-change-transform"
          style={{ transform: `translateY(${offset}px)` }}
          loading="lazy"
        />
      </div>
    </section>

    <section className="container-edit pb-20 md:pb-28">
      <SectionHeader eyebrow="Nuestra historia" title={<>De pequeño distribuidor<br />a partner <span className="pink-underline">de referencia</span>.</>} />
      <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        {milestones.map((m) => (
          <div key={m.year} className="border-t border-border pt-6 space-y-2">
            <p className="font-display font-light text-3xl text-accent">{m.year}</p>
            <h3 className="font-display font-medium text-lg">{m.title}</h3>
            <p className="text-sm text-muted-foreground">{m.desc}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="bg-primary text-primary-foreground relative overflow-hidden">
      <Circle variant="outline" className="w-[500px] h-[500px] -top-40 -right-40 border-primary-foreground/10" />
      <div className="container-edit py-20 md:py-28 relative grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5 space-y-5">
          <p className="eyebrow text-primary-foreground/60">Cómo trabajamos</p>
          <h2 className="display-md text-balance">Cerca de cada<br /><span className="italic font-light text-accent">cliente.</span></h2>
        </div>
        <div className="lg:col-span-7 grid sm:grid-cols-2 gap-8">
          {[
            { t: "Empresa familiar", d: "Tres generaciones. Conocemos por su nombre a los clientes que llevan décadas con nosotros." },
            { t: "Profesionalizada", d: "Procesos, trazabilidad y logística propia. Te servimos como una multinacional, te tratamos como vecinos." },
            { t: "Visión gourmet", d: "Buscamos lo que aún no se conoce. Visitamos productores. Probamos antes que nadie." },
            { t: "Innovación", d: "Apostamos por producto inclusivo, sin alérgenos y formatos pensados para tu negocio." },
          ].map((b) => (
            <div key={b.t} className="space-y-2 border-t border-primary-foreground/15 pt-6">
              <h3 className="font-display font-medium text-lg">{b.t}</h3>
              <p className="text-sm text-primary-foreground/70">{b.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="container-edit py-24 md:py-32 text-center relative">
      <Circle variant="accent" className="w-[400px] h-[400px] left-1/2 -translate-x-1/2 -top-20" />
      <div className="relative max-w-2xl mx-auto space-y-6">
        <h2 className="display-md text-balance">¿Empezamos a trabajar juntos?</h2>
        <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:bg-accent transition-colors">
          <MessageCircle className="h-5 w-5" /> Hablemos
        </a>
      </div>
    </section>
  </Layout>
  );
};

export default SobreNosotros;
