import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { SectionHeader } from "@/components/SectionHeader";
import { ProductCard } from "@/components/ProductCard";
import { products } from "@/lib/products";
import { ArrowRight, MessageCircle, ChefHat } from "lucide-react";
import { Link } from "react-router-dom";
import { waLink } from "@/lib/contact";
import xef from "@/assets/xef.jpg";

const SecretsDelXef = () => {
  const items = products.filter((p) => p.specialties.includes("secrets") || p.category === "Foie");
  return (
    <Layout navTheme="dark" heroFlush>
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <Circle variant="outline" className="w-[600px] h-[600px] -top-40 -left-40 border-primary-foreground/10" />
        <Circle variant="blur" className="w-96 h-96 -bottom-20 right-0" />
        <div className="container-edit pt-28 md:pt-36 pb-20 md:pb-28 relative grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <p className="eyebrow text-primary-foreground/60">Para hostelería</p>
            <h1 className="display text-balance">Secrets<br /><span className="italic font-light text-accent">del Xef.</span></h1>
            <p className="text-lg text-primary-foreground/75 max-w-xl">Producto pensado para servicio. 4ª y 5ª gama, platos preparados de autor, ingredientes diferenciales que ahorran tiempo sin renunciar al criterio.</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/catalogo?cliente=horeca" className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:opacity-90 transition-opacity">
                <ChefHat className="h-5 w-5" /> Catálogo para tu negocio
              </Link>
              <a href={waLink("Hola, me interesa la gama Secrets del Xef.")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-primary-foreground/40 text-primary-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:bg-primary-foreground hover:text-primary transition-colors">
                <MessageCircle className="h-5 w-5" /> Hablar con comercial
              </a>
            </div>
          </div>
          <div className="lg:col-span-6 relative">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden">
              <img src={xef} alt="Chef emplatando en restaurante" className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-center p-4 shadow-glow">
              <span className="text-xs font-medium leading-tight">listo para<br />emplatar</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container-edit py-20 md:py-28">
        <SectionHeader eyebrow="Beneficios para tu cocina" title={<>Tiempo, criterio y <span className="pink-underline">consistencia</span>.</>} />
        <div className="mt-12 grid md:grid-cols-3 gap-8">
          {[
            { t: "Sin merma", d: "Porcionado y formato pensado para servicio. Aprovecha el 100%." },
            { t: "Calidad uniforme", d: "Misma receta plato a plato. Tu cliente repite porque sabe a lo de siempre." },
            { t: "Tu carta, tu autoría", d: "Te damos la base. Tú añades la firma. Nadie sabrá que no es 100% de la casa." },
          ].map((b, i) => (
            <div key={b.t} className="border-t border-border pt-8 space-y-3">
              <span className="text-xs text-muted-foreground">0{i + 1}</span>
              <h3 className="font-display font-light text-2xl">{b.t}</h3>
              <p className="text-sm text-muted-foreground">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-edit pb-24 md:pb-32">
        <SectionHeader eyebrow="Selección" title="Lo que está saliendo de cocina." />
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {items.map((p) => (
            <ProductCard key={p.slug} image={p.image} title={p.name} category={p.category} origin={p.origin} href={`/producto/${p.slug}`} />
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default SecretsDelXef;
