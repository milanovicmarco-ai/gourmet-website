import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { SectionHeader } from "@/components/SectionHeader";
import { ProductCard } from "@/components/ProductCard";
import { products } from "@/lib/products";
import { ArrowRight, MessageCircle, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { waLink } from "@/lib/contact";
import colmadoImg from "@/assets/colmado.jpg";

const Colmado = () => {
  const items = products.filter((p) =>
    p.clientTypes.some((c) => c === "establecimientos" || c === "tiendas-gourmet"),
  );

  return (
    <Layout navTheme="dark" heroFlush>
      {/* HERO */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <Circle variant="outline" className="w-[600px] h-[600px] -top-40 -left-40 border-primary-foreground/10" />
        <Circle variant="blur" className="w-96 h-96 -bottom-20 right-0" />
        <div className="container-edit pt-28 md:pt-36 pb-20 md:pb-28 relative grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <p className="eyebrow text-primary-foreground/60">Para tiendas y mercados</p>
            <h1 className="display text-balance">
              Colmado<br />
              <span className="italic font-light text-accent">Aurellano.</span>
            </h1>
            <p className="text-lg text-primary-foreground/75 max-w-xl">
              Producto gourmet pensado para tiendas, supermercados especializados, paradas de mercado y
              ultramarinos. Alta rotación, márgenes saneados y un surtido que diferencia tu lineal.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/catalogo?cliente=retail"
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

      {/* SELECCIÓN */}
      <section className="container-edit pb-20 md:pb-28">
        <SectionHeader eyebrow="Selección retail" title="Lo que está volando del lineal." />
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {items.slice(0, 8).map((p) => (
            <ProductCard key={p.slug} image={p.image} title={p.name} category={p.category} origin={p.origin} href={`/producto/${p.slug}`} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-edit pb-24 md:pb-32">
        <div className="rounded-3xl bg-accent text-accent-foreground p-10 md:p-16 text-center relative overflow-hidden">
          <Circle variant="outline" className="w-80 h-80 -top-20 -right-20 border-accent-foreground/20" />
          <div className="relative max-w-2xl mx-auto space-y-6">
            <h2 className="display-md text-balance">
              Catálogo pensado<br /><em className="font-light">para tu tienda.</em>
            </h2>
            <Link
              to="/catalogo?cliente=retail"
              className="inline-flex items-center gap-2 bg-accent-foreground text-accent rounded-full pl-6 pr-7 py-4 font-medium hover:opacity-90 transition-opacity"
            >
              Ver catálogo para tiendas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Colmado;
