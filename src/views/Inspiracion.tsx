"use client";

import { Layout } from "@/components/Layout";
import { useI18n } from "@/lib/i18n";
import type { InspirationCatalog } from "@/lib/pim/inspiration";

interface Props {
  catalogs: InspirationCatalog[];
}

export function InspiracionView({ catalogs }: Props) {
  const { t } = useI18n();

  return (
    <Layout navTheme="light">
      {/* Hero ligero */}
      <section className="container-edit pt-32 md:pt-40 pb-10 md:pb-14">
        <div className="max-w-3xl space-y-6">
          <p className="eyebrow">{t("Inspiración")}</p>
          <h1 className="display text-balance">
            {t("Catálogos")} <br />
            <span className="italic font-light text-accent">{t("y colecciones.")}</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl text-pretty">
            {t("Selecciones y dossieres en PDF de Aurellano y nuestras marcas distribuidas.")}
          </p>
        </div>
      </section>

      {/* Grid de portfolio */}
      <section className="container-edit pb-20 md:pb-32">
        {catalogs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-12 md:p-20 text-center space-y-5">
            <h2 className="font-display font-light text-3xl">{t("Próximamente")}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t(
                "Estamos preparando las nuevas selecciones. Vuelve pronto o pídenos un catálogo concreto por WhatsApp.",
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            {catalogs.map((c) => (
              <CatalogCard key={c.id} catalog={c} downloadLabel={t("Ver catálogo")} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}

// Default export para que el validador de Next.js no se queje del folder legacy `src/pages/`.
// La importación canónica usa el named export `InspiracionView`.
export default InspiracionView;

function CatalogCard({
  catalog,
  downloadLabel,
}: {
  catalog: InspirationCatalog;
  downloadLabel: string;
}) {
  return (
    <a
      href={catalog.pdf_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block hover-lift"
    >
      {/* Carátula */}
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-secondary border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={catalog.cover_url}
          alt={catalog.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="absolute bottom-4 left-4 right-4 text-xs text-white font-medium uppercase tracking-[0.18em] opacity-0 group-hover:opacity-100 transition-opacity">
          {downloadLabel} →
        </span>
      </div>

      {/* Logo pequeño + título */}
      <div className="mt-4 flex items-start gap-3">
        {catalog.logo_url && (
          <div className="h-9 w-9 rounded-md bg-secondary border border-border grid place-items-center overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={catalog.logo_url}
              alt=""
              className="max-h-full max-w-full object-contain p-1"
            />
          </div>
        )}
        <h3 className="font-display font-medium text-base md:text-lg leading-tight">
          {catalog.title}
        </h3>
      </div>
    </a>
  );
}
