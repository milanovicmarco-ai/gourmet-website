// Skeleton inmediato para /admin/products/new. La página es force-dynamic
// porque carga marcas, familias y catálogos del partner, y sin este loader
// el navegador se quedaría sin feedback hasta que termine.
export default function Loading() {
  return (
    <div className="px-5 md:px-10 py-8 space-y-8 max-w-3xl animate-pulse">
      <div className="h-3 w-32 bg-muted rounded" />
      <div className="space-y-3 border-b border-border pb-6">
        <div className="h-3 w-40 bg-muted rounded" />
        <div className="h-9 w-72 bg-muted rounded" />
      </div>
      <div className="space-y-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-32 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded" />
          </div>
        ))}
        <div className="h-12 w-40 bg-muted rounded-full" />
      </div>
    </div>
  );
}
