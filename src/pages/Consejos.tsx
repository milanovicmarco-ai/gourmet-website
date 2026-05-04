import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { BookOpen, ChefHat, Wine } from "lucide-react";

const articles = [
  {
    icon: ChefHat,
    eyebrow: "Tabla de quesos",
    title: "Cómo montar una tabla de quesos memorable",
    excerpt: "Variedad de leches, intensidades y maridajes. Cantidades, orden de cata y acompañamientos imprescindibles.",
  },
  {
    icon: Wine,
    eyebrow: "Maridajes",
    title: "Foie y vinos dulces: el matrimonio perfecto",
    excerpt: "De Sauternes a Pedro Ximénez. Por qué funcionan y cómo elegir según el tipo de foie.",
  },
  {
    icon: BookOpen,
    eyebrow: "Conservación",
    title: "Conservar quesos curados sin perder cualidades",
    excerpt: "Temperatura, humedad y atemperado. Errores frecuentes en cocinas profesionales.",
  },
];

const Consejos = () => {
  return (
    <Layout>
      <section className="container-edit pt-32 md:pt-40 pb-16 relative">
        <Circle variant="accent" className="w-72 h-72 -top-10 -right-10 hidden lg:block" />
        <div className="max-w-3xl space-y-6 relative">
          <p className="eyebrow">Consejos</p>
          <h1 className="display">
            <span className="pink-underline">Saber gourmet</span> para profesionales
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Maridajes, técnicas, conservación y trucos de oficio. Compartimos lo que aprendemos cada día con nuestros proveedores y clientes.
          </p>
        </div>
      </section>

      <section className="container-edit pb-24 md:pb-32 grid md:grid-cols-3 gap-6 lg:gap-8">
        {articles.map((a) => (
          <article
            key={a.title}
            className="group rounded-3xl border border-border p-8 hover-lift bg-background"
          >
            <a.icon className="h-8 w-8 text-accent mb-6" />
            <p className="eyebrow mb-3">{a.eyebrow}</p>
            <h2 className="font-display font-light text-2xl tracking-tight mb-4">{a.title}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">{a.excerpt}</p>
            <span className="mt-6 inline-block text-sm font-medium group-hover:text-accent transition-colors">
              Próximamente →
            </span>
          </article>
        ))}
      </section>

      <section className="bg-secondary/40 border-t border-border">
        <div className="container-edit py-20 md:py-24 text-center max-w-2xl mx-auto space-y-6">
          <h2 className="font-display font-light text-3xl md:text-4xl tracking-tight">¿Tienes una duda concreta?</h2>
          <p className="text-muted-foreground">Nuestro equipo lleva +50 años entre quesos, foies y despensas premium. Pregúntanos.</p>
          <Link
            to="/contacto"
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-full px-7 py-4 font-medium hover:bg-accent transition-colors"
          >
            Contactar
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default Consejos;
