"use client";

import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { SectionHeader } from "@/components/SectionHeader";
import { ProductCard } from "@/components/ProductCard";
import { products } from "@/lib/products";
import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/contact";
const foie = "/images/foie-vegano.jpg";

const Foie = () => {
  const items = products.filter((p) => p.category === "Foie");
  return (
    <Layout
      seoTitle="Foie y terrinas | Aurellano Productes Gastronòmics"
      seoDescription="Foie mi-cuit, bloc, escalopa y nuestra apuesta inclusiva: foie vegano de anacardo. Producto premium para restauración y tienda."
    >
      <section className="relative overflow-hidden">
        <Circle variant="blur" className="w-96 h-96 top-10 -right-20" />
        <div className="container-edit pt-16 md:pt-24 pb-16 md:pb-20 grid lg:grid-cols-12 gap-12 items-center relative">
          <div className="lg:col-span-6 space-y-6">
            <p className="eyebrow">Tradición e innovación</p>
            <h1 className="display text-balance">Foie<br /><span className="italic font-light text-accent">en todas sus formas.</span></h1>
            <p className="text-lg text-muted-foreground max-w-xl">Mi-cuit tradicional, mi-cuit con trufa, bloc, escalopa para plancha. Y nuestra apuesta inclusiva: foie vegano de anacardo, premium e indistinguible.</p>
            <a href={waLink("Hola, me interesa vuestra gama de foie.")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:bg-accent transition-colors">
              <MessageCircle className="h-5 w-5" /> Hablar de foie
            </a>
          </div>
          <div className="lg:col-span-6">
            <div className="aspect-square rounded-full overflow-hidden ring-accent-soft max-w-md mx-auto">
              <img src={foie} alt="Foie vegano artesanal" className="h-full w-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      <section className="container-edit pb-24 md:pb-32">
        <SectionHeader eyebrow="Selección" title="Tradicional + vegano." />
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {items.concat(items).slice(0, 3).map((p, i) => (
            <ProductCard key={i} image={p.image} title={p.name} category={p.category} origin={p.origin} href={`/producto/${p.slug}`} />
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default Foie;
