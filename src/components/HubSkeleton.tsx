import { Circle } from "@/components/Circle";

/**
 * Skeleton compartido para los hubs comerciales (Quesos, Colmado, Secrets du
 * Xef). Reproduce la estructura: hero oscuro + grid de 4 productos. Se monta
 * INSTANTÁNEAMENTE al navegar mientras el server component fetcha datos.
 */
export function HubSkeleton() {
  return (
    <>
      {/* Hero placeholder oscuro */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <Circle variant="outline" className="w-[600px] h-[600px] -top-40 -left-40 border-primary-foreground/10" />
        <Circle variant="blur" className="w-96 h-96 -bottom-20 right-0" />
        <div className="container-edit pt-28 md:pt-36 pb-20 md:pb-28 relative grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="h-3 w-32 bg-primary-foreground/15 rounded animate-pulse" />
            <div className="space-y-3">
              <div className="h-16 md:h-20 w-2/3 bg-primary-foreground/15 rounded animate-pulse" />
              <div className="h-16 md:h-20 w-1/2 bg-primary-foreground/15 rounded animate-pulse" />
            </div>
            <div className="h-5 w-full max-w-xl bg-primary-foreground/15 rounded animate-pulse" />
            <div className="flex gap-3 pt-2">
              <div className="h-12 w-48 bg-primary-foreground/15 rounded-full animate-pulse" />
              <div className="h-12 w-44 bg-primary-foreground/15 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="aspect-[4/5] bg-primary-foreground/10 rounded-3xl animate-pulse" />
          </div>
        </div>
      </section>

      {/* Beneficios placeholder (3 columnas) */}
      <section className="container-edit py-20 md:py-28">
        <div className="space-y-3 max-w-2xl">
          <div className="h-3 w-32 bg-muted rounded animate-pulse" />
          <div className="h-10 w-2/3 bg-muted rounded animate-pulse" />
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border-t border-border pt-8 space-y-3">
              <div className="h-3 w-6 bg-muted rounded animate-pulse" />
              <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-3 w-full bg-muted rounded animate-pulse" />
              <div className="h-3 w-5/6 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>

      {/* Grid de tarjetas placeholders */}
      <section className="container-edit pb-24 md:pb-32">
        <div className="space-y-3 max-w-2xl mb-12">
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          <div className="h-9 w-1/2 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[4/5] bg-muted rounded-2xl animate-pulse" />
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
