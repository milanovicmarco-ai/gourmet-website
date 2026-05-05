"use client";

import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { SectionHeader } from "@/components/SectionHeader";
import { ProductCard } from "@/components/ProductCard";
import { products } from "@/lib/products";
import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/contact";
import sin from "@/assets/sin-alergenos.jpg";

const EspecialSin = () => {
  const items = products.filter((p) => p.category === "Especial Sin" || p.allergens.length === 0);
  return (
    <Layout
      seoTitle="Especial Sin | Aurellano Productos Gastronómicos"
      seoDescription="Selección gourmet sin gluten, sin lactosa, sin huevo y vegana. Para que tu carta no excluya a nadie y mantenga el sabor."
    >
      <section className="relative overflow-hidden bg-secondary/40">
        <Circle variant="outline" className="w-[500px] h-[500px] -top-32 -left-32 hidden md:block" />
        <div className="container-edit pt-16 md:pt-24 pb-16 md:pb-20 grid lg:grid-cols-12 gap-12 items-center relative">
          <div className="lg:col-span-6 space-y-6">
            <p className="eyebrow">Inclusivo y delicioso</p>
            <h1 className="display text-balance">Especial<br /><span className="italic font-light text-accent">"Sin".</span></h1>
            <p className="text-lg text-muted-foreground max-w-xl">Sin gluten, sin lactosa, sin huevo, vegano. Para que tu carta no excluya a nadie y tu mesa healthy no renuncie al sabor.</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {["Sin gluten", "Sin lactosa", "Sin huevo", "Vegano", "Sin frutos secos"].map((t) => (
                <span key={t} className="text-xs px-3 py-1.5 rounded-full bg-accent/10 text-accent border border-accent/20">{t}</span>
              ))}
            </div>
            <a href={waLink("Hola, busco productos sin alérgenos para mi carta.")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:bg-accent transition-colors">
              <MessageCircle className="h-5 w-5" /> Asesoramiento
            </a>
          </div>
          <div className="lg:col-span-6">
            <div className="aspect-square rounded-full overflow-hidden ring-accent-soft max-w-md mx-auto">
              <img src={sin} alt="Productos sin alérgenos" className="h-full w-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      <section className="container-edit py-20 md:py-28">
        <SectionHeader eyebrow="Selección" title="Producto inclusivo, criterio gourmet." />
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {items.concat(items).slice(0, 8).map((p, i) => (
            <ProductCard key={i} image={p.image} title={p.name} category={p.category} origin={p.origin} href={`/producto/${p.slug}`} />
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default EspecialSin;
