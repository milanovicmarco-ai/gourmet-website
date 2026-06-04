import { Layout } from "@/components/Layout";

/**
 * Loading UI del catálogo. Se monta INSTANTÁNEAMENTE al navegar a /catalogo,
 * mientras el server component principal (page.tsx) fetcha productos, familias
 * y metas. Cuando esos datos están listos, Next sustituye este skeleton por el
 * contenido real sin saltos.
 *
 * Sensación buscada: clic → la página aparece YA (con nav, footer y placeholders)
 * en lugar de quedarse el navegador parado varios segundos esperando al servidor.
 */
export default function CatalogoLoading() {
  return (
    <Layout navTheme="light">
      {/* Hero placeholder */}
      <section className="container-edit pt-32 md:pt-40 pb-10 md:pb-14">
        <div className="max-w-4xl space-y-6">
          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
          <div className="space-y-3">
            <div className="h-12 md:h-16 w-3/4 bg-muted rounded-lg animate-pulse" />
            <div className="h-12 md:h-16 w-1/2 bg-muted rounded-lg animate-pulse" />
          </div>
          <div className="h-5 w-full max-w-2xl bg-muted rounded animate-pulse" />
        </div>
      </section>

      {/* Buscador + filtros placeholders */}
      <section className="container-edit pb-8 max-w-5xl space-y-3">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
          <div className="h-12 bg-secondary border border-border rounded-full animate-pulse" />
          <div className="h-12 w-28 bg-muted rounded-full animate-pulse" />
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-secondary border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      </section>

      {/* Grid de tarjetas placeholders */}
      <section className="container-edit pb-24 md:pb-32">
        <div className="border-b border-border pb-4 mb-8 flex items-baseline justify-between">
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[4/5] bg-muted rounded-2xl animate-pulse" />
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
