"use client";

// Se activa cuando algo en /admin/products/[id]/page.tsx tira un Error
// que no es notFound(). Casi siempre es un timeout/red contra la partner
// API. Mostramos el mensaje real y dejamos a Marco reintentar sin recargar
// la pestaña entera.
export default function EditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="px-5 md:px-10 py-12 max-w-2xl space-y-6">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          PIM · Editor
        </p>
        <h1 className="font-display font-light text-3xl tracking-tight">
          No se pudo cargar el producto
        </h1>
        <p className="text-sm text-muted-foreground">
          Algo entre Vercel y la API del socio falló al cargar este producto.
          Casi siempre se resuelve reintentando — el backend de Hostinger
          puede arrancar lento tras inactividad.
        </p>
      </div>

      <details className="rounded-lg border border-border bg-secondary/30 p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Detalle técnico
        </summary>
        <pre className="mt-3 text-xs overflow-x-auto whitespace-pre-wrap text-muted-foreground">
{error.message}
{error.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
      </details>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-primary text-primary-foreground border border-primary px-5 py-2.5 text-sm font-semibold hover:bg-accent hover:border-accent transition-colors"
        >
          Reintentar
        </button>
        <a
          href="/admin/products"
          className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:border-foreground transition-colors"
        >
          ← Volver al listado
        </a>
      </div>
    </div>
  );
}
