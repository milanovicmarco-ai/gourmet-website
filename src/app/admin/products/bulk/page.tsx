import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/integrations/supabase/server";
import { BulkImportClient } from "./bulk-import-client";

export const dynamic = "force-dynamic";

export default async function BulkPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  return (
    <div className="px-5 md:px-10 py-8 max-w-4xl space-y-10">
      <Link
        href="/admin/products"
        className="text-xs text-muted-foreground hover:text-accent transition-colors uppercase tracking-[0.18em]"
      >
        ← Volver al listado
      </Link>

      <header className="space-y-3 border-b border-border pb-6">
        <p className="eyebrow">Bulk · Excel</p>
        <h1 className="font-display font-light text-3xl md:text-4xl tracking-tight">
          Editar el catálogo desde un Excel
        </h1>
        <p className="text-muted-foreground max-w-2xl text-pretty">
          Descarga la hoja con todos los productos actuales, edítala offline
          (puedes añadir filas nuevas o marcar borrados) y súbela de vuelta.
          Al subir, mostraremos un resumen previo y aplicaremos sólo si
          confirmas.
        </p>
      </header>

      <section className="space-y-5">
        <h2 className="font-display font-medium text-xl">1 · Descargar Excel actual</h2>
        <p className="text-sm text-muted-foreground">
          Genera el .xlsx con todos los productos del catálogo (canónica + alias
          de ref, todos los campos editables, los 8 flags dietéticos, catálogos
          asignados). Las imágenes no entran en el Excel — se siguen gestionando
          desde el editor de galería de cada producto.
        </p>
        <a
          href="/admin/products/bulk/export"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-6 py-3 text-sm font-medium hover:bg-accent transition-colors"
        >
          Descargar catálogo .xlsx
        </a>
      </section>

      <section className="space-y-5 border-t border-border pt-10">
        <h2 className="font-display font-medium text-xl">2 · Subir Excel editado</h2>
        <p className="text-sm text-muted-foreground">
          Selecciona el .xlsx que has editado. Al pulsar &ldquo;Previsualizar&rdquo; te
          enseñaremos qué se va a modificar, crear y borrar. Nada se aplica hasta
          que confirmas en el siguiente paso.
        </p>
        <BulkImportClient />
      </section>

      <section className="space-y-3 border-t border-border pt-10 text-xs text-muted-foreground">
        <h3 className="font-medium text-foreground">Notas técnicas</h3>
        <ul className="list-disc list-inside space-y-1.5">
          <li>
            La <code>ref</code> es la PK en la API del socio: NO se renombra al
            subir (la API la trata como inmutable). Para cambiar la ref visible
            usa <code>ref_visible</code> — es el alias que se muestra al público.
          </li>
          <li>
            La <code>marca</code> se guarda en nuestro overlay (no en la API),
            así que puedes escribir cualquier texto libre sin pelearte con su FK
            de marcas.
          </li>
          <li>
            Listas (tags, maridajes, alérgenos, catálogos): separadas por comas
            en una sola celda.
          </li>
          <li>
            Booleanos: <code>TRUE</code>/<code>FALSE</code>, <code>SÍ</code>/<code>NO</code>
            , <code>1</code>/<code>0</code>. Celda vacía = no se cambia el valor.
          </li>
        </ul>
      </section>
    </div>
  );
}
