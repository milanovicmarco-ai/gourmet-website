// Skeleton que se muestra inmediatamente al navegar a /admin/products/<ref>.
// Sin esto, como la página es force-dynamic y hace 7 fetches en paralelo,
// el navegador se queda mostrando la página anterior sin feedback hasta
// que todo termine — sensación de "no reacciona el clic".
export default function Loading() {
  return (
    <div className="px-5 md:px-10 py-8 space-y-8 max-w-5xl animate-pulse">
      <div className="h-3 w-32 bg-muted rounded" />

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-3">
          <div className="h-3 w-48 bg-muted rounded" />
          <div className="h-9 w-80 bg-muted rounded" />
          <div className="h-3 w-40 bg-muted rounded" />
        </div>
        <div className="text-right space-y-2">
          <div className="h-3 w-40 bg-muted rounded ml-auto" />
          <div className="h-10 w-24 bg-muted rounded ml-auto" />
        </div>
      </header>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-10">
          <section className="rounded-2xl border border-border p-6 bg-background space-y-4">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="aspect-[4/3] bg-muted rounded-xl" />
          </section>
          <section className="rounded-2xl border border-border p-6 bg-background space-y-4">
            <div className="h-4 w-40 bg-muted rounded" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 w-28 bg-muted rounded-full" />
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-border p-6 bg-background space-y-4">
            <div className="h-4 w-48 bg-muted rounded" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-10 w-full bg-muted rounded" />
              </div>
            ))}
          </section>
        </div>
        <aside className="lg:col-span-4">
          <div className="sticky top-6 space-y-6">
            <div className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-3">
              <div className="h-4 w-44 bg-muted rounded" />
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-4 w-full bg-muted rounded" />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
