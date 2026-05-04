import { Link } from "react-router-dom";
import { Instagram, MessageCircle, Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";
import logoSrc from "@/assets/logo-aurellano.png";
import {
  WHATSAPP_LINK,
  INSTAGRAM,
  INSTAGRAM_HANDLE,
  EMAIL,
  PHONE_FIXED,
  ADDRESS,
} from "@/lib/contact";

const columns = [
  {
    title: "Nuestros productos",
    links: [
      { to: "/catalogo", label: "Catálogo completo" },
      { to: "/quesos", label: "Quesos afinados" },
      { to: "/foie", label: "Foie & terrinas" },
      { to: "/despensa", label: "Despensa gourmet" },
    ],
  },
  {
    title: "Secretos del Chef",
    links: [
      { to: "/secrets-del-xef", label: "5ª gama premium" },
      { to: "/secrets-del-xef", label: "Platos preparados" },
      { to: "/secrets-del-xef", label: "Croquetas & canelones" },
    ],
  },
  {
    title: "Colmado",
    links: [
      { to: "/catalogo", label: "Conservas" },
      { to: "/despensa", label: "Aceites & vinagres" },
      { to: "/despensa", label: "Panes artesanos" },
    ],
  },
  {
    title: "Especialidades",
    links: [
      { to: "/especial-sin", label: "Sin gluten" },
      { to: "/especial-sin", label: "Sin lactosa" },
      { to: "/especial-sin", label: "Vegano premium" },
    ],
  },
  {
    title: "Aurellano",
    links: [
      { to: "/sobre-nosotros", label: "Sobre nosotros" },
      { to: "/consejos", label: "Consejos" },
      { to: "/contacto", label: "Contacto" },
      { to: "/condiciones", label: "Condiciones" },
    ],
  },
];

export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground relative overflow-hidden">
      {/* Decor */}
      <div
        className="absolute -top-48 -right-48 w-[520px] h-[520px] rounded-full border border-primary-foreground/10"
        aria-hidden
      />
      <div
        className="absolute -bottom-40 -left-40 w-[420px] h-[420px] rounded-full bg-accent/15 blur-3xl"
        aria-hidden
      />

      {/* TOP — Brand statement */}
      <div className="container-edit relative pt-20 md:pt-28 pb-14 md:pb-20 border-b border-primary-foreground/10">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-end">
          <div className="lg:col-span-8 space-y-6">
            <p className="eyebrow text-primary-foreground/60">Aurellano · desde 1968</p>
            <h2 className="font-display font-light text-4xl md:text-6xl lg:text-7xl leading-[1] tracking-tight text-balance">
              Distribución gourmet con
              <span className="italic text-accent"> criterio</span>.
            </h2>
            <p className="text-primary-foreground/70 max-w-xl text-base md:text-lg leading-relaxed">
              +50 años seleccionando producto para restaurantes, hoteles y tiendas que buscan algo más.
            </p>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end">
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 bg-accent text-accent-foreground rounded-full pl-6 pr-7 py-4 text-sm font-semibold hover:bg-accent/90 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Hablemos por WhatsApp
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>
      </div>

      {/* MIDDLE — Sitemap */}
      <div className="container-edit relative py-16 md:py-20 grid gap-12 lg:grid-cols-12">
        {/* Brand column */}
        <div className="lg:col-span-3 space-y-6">
          <Link to="/" aria-label="Aurellano · Inicio" className="inline-block">
            <img
              src={logoSrc}
              alt="Aurellano"
              className="h-20 w-20 md:h-24 md:w-24 object-contain"
            />
          </Link>
          <ul className="space-y-3 text-sm text-primary-foreground/85">
            <li className="flex items-start gap-3">
              <MapPin className="h-4 w-4 mt-0.5 text-accent shrink-0" />
              <span>{ADDRESS}</span>
            </li>
            <li className="flex items-start gap-3">
              <Phone className="h-4 w-4 mt-0.5 text-accent shrink-0" />
              <span>{PHONE_FIXED}</span>
            </li>
            <li className="flex items-start gap-3">
              <Mail className="h-4 w-4 mt-0.5 text-accent shrink-0" />
              <a href={`mailto:${EMAIL}`} className="hover:text-accent transition-colors">
                {EMAIL}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Instagram className="h-4 w-4 mt-0.5 text-accent shrink-0" />
              <a
                href={INSTAGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                {INSTAGRAM_HANDLE}
              </a>
            </li>
          </ul>
        </div>

        {/* Sitemap columns */}
        <div className="lg:col-span-9 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 md:gap-6">
          {columns.map((col) => (
            <div key={col.title} className="space-y-4">
              <p className="text-xs uppercase tracking-[0.18em] text-accent font-semibold">
                {col.title}
              </p>
              <ul className="space-y-2.5 text-sm text-primary-foreground/80">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="hover:text-accent transition-colors inline-block"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM */}
      <div className="relative border-t border-primary-foreground/10">
        <div className="container-edit py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-primary-foreground/55">
          <p>© {new Date().getFullYear()} Aurellano productes gastronòmics. Todos los derechos reservados.</p>
          <p>Lleida · Catalunya</p>
        </div>
      </div>
    </footer>
  );
};
