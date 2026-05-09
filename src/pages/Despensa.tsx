"use client";

import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { SectionHeader } from "@/components/SectionHeader";
import { ProductCard } from "@/components/ProductCard";
import { products } from "@/lib/products";
import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/contact";
const despensa = "/images/despensa.jpg";

const Despensa = () => {
  const items = products.filter((p) => p.category === "Conservas" || p.category === "Despensa");
  return (
    <Layout
      seoTitle="Despensa gourmet | Aurellano Productos Gastronómicos"
      seoDescription="Conservas premium, AOVE, vinagres, panes artesanos, pasta y dulces gourmet. La base de cualquier cocina con criterio."
    >
      <section className="relative overflow-hidden">
        <Circle variant="accent" className="w-72 h-72 top-20 -right-20 hidden md:block" />
        <div className="container-edit pt-16 md:pt-24 pb-16 md:pb-20 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <p className="eyebrow">La despensa</p>
            <h1 className="display text-balance">Despensa<br /><span className="italic font-light text-accent">gourmet.</span></h1>
            <p className="text-lg text-muted-foreground max-w-xl">Conservas, aceites, vinagres, panes, pasta y dulces. La base de cualquier cocina con criterio.</p>
            <a href={waLink("Hola, querría información sobre la despensa gourmet.")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:bg-accent transition-colors">
              <MessageCircle className="h-5 w-5" /> Hablar con nosotros
            </a>
          </div>
          <div className="lg:col-span-6">
            <div className="aspect-[5/4] rounded-3xl overflow-hidden">
              <img src={despensa} alt="Despensa gourmet con pan, aceite y conservas" className="h-full w-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      <section className="container-edit pb-24 md:pb-32">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {items.concat(items).slice(0, 8).map((p, i) => (
            <ProductCard key={i} image={p.image} title={p.name} category={p.category} origin={p.origin} href={`/producto/${p.slug}`} />
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default Despensa;
