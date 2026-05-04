import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { SectionHeader } from "@/components/SectionHeader";
import { ProductCard } from "@/components/ProductCard";
import { products } from "@/lib/products";
import { WHATSAPP_LINK, waLink } from "@/lib/contact";
import cheeses from "@/assets/cheeses.jpg";
import quesoDetalle from "@/assets/queso-detalle.jpg";

const origins = ["Cataluña", "Castilla", "Asturias", "País Vasco", "Francia", "Italia", "Suiza", "Holanda"];
const intensities = ["Suave", "Medio", "Intenso", "Muy intenso"];
const families = ["Vaca", "Cabra", "Oveja", "Mezclas", "Azules", "Pasta blanda", "Pasta dura", "Vegano"];

const pairings = [
  { cheese: "Manchego 12M", with: "Membrillo + tinto reserva" },
  { cheese: "Brie de Meaux", with: "Mermelada de higo + cava" },
  { cheese: "Roquefort", with: "Miel + Pedro Ximénez" },
  { cheese: "Idiazábal ahumado", with: "Pera + sidra natural" },
];

const Quesos = () => {
  const quesos = products.filter((p) => p.category === "Quesos");

  return (
    <Layout>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <Circle variant="blur" className="w-[500px] h-[500px] top-0 -left-40" />
        <div className="container-edit pt-12 md:pt-20 pb-12 md:pb-20 relative grid lg:grid-cols-12 gap-12 items-center">
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

      {/* DESTACADOS */}
      <section className="container-edit py-20 md:py-28">
        <SectionHeader eyebrow="Hoy en cámara" title={<>Algunos de nuestros <span className="pink-underline">imprescindibles</span>.</>} />
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {[...quesos, ...quesos, ...quesos, ...quesos].slice(0, 4).map((p, i) => (
            <ProductCard key={i} image={p.image} title={p.name} category={p.category} origin={p.origin} href={`/producto/${p.slug}`} circle={i % 2 === 0} />
          ))}
        </div>
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

      {/* CTA */}
      <section className="container-edit py-20 md:py-28">
        <div className="relative overflow-hidden rounded-3xl bg-secondary p-10 md:p-16 text-center">
          <Circle variant="accent" className="w-72 h-72 -top-20 -right-20" />
          <div className="relative max-w-2xl mx-auto space-y-6">
            <h2 className="display-md text-balance">¿Montamos tu tabla?</h2>
            <p className="text-muted-foreground">Te asesoramos por WhatsApp con cantidades, formatos y maridajes.</p>
            <a href={waLink("Hola Aurellano, querría asesoramiento sobre quesos.")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:bg-accent transition-colors">
              <MessageCircle className="h-5 w-5" /> Hablemos de quesos
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Quesos;
