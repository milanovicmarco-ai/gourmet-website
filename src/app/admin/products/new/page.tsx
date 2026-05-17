import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/integrations/supabase/server";
import { listAllFamilies } from "@/lib/pim/catalogs";
import { AURELLANO_API } from "@/lib/pim/api";
import { ProductCreateForm } from "./create-form";
import type { EntityOption } from "../[id]/entity-combobox";

export const dynamic = "force-dynamic";

/** Trae las marcas de la API del socio para alimentar el combobox.
 *  Si falla, devuelve lista vacía — el combobox permite crear marcas nuevas igual. */
async function loadBrandOptions(): Promise<EntityOption[]> {
  try {
    const r = await fetch(`${AURELLANO_API}/catalog/brands`, { cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json();
    const list: { slug?: string; name?: string }[] = Array.isArray(data)
      ? data
      : data.results ?? [];
    return list
      .map((b) => ({ slug: (b.slug ?? "").trim(), name: (b.name ?? b.slug ?? "").trim() }))
      .filter((b) => b.slug.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.warn("[NewProductPage] loadBrandOptions error:", (err as Error).message);
    return [];
  }
}

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const [families, brandOptions] = await Promise.all([
    listAllFamilies().catch(() => []),
    loadBrandOptions(),
  ]);
  const familyOptions: EntityOption[] = families.map((f) => ({
    slug: f.slug,
    name: f.display_name,
  }));

  return (
    <div className="px-5 md:px-10 py-8 space-y-8 max-w-3xl">
      <Link
        href="/admin/products"
        className="text-xs text-muted-foreground hover:text-accent transition-colors uppercase tracking-[0.18em]"
      >
        ← Volver al listado
      </Link>

      <header className="border-b border-border pb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">PIM · Catálogo</p>
        <h1 className="font-display font-light text-3xl md:text-4xl tracking-tight mt-1">
          Nuevo producto
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Asigna la <code>ref</code> (código interno de Aurellano) y la familia. La imagen,
          el resto de campos y el SEO los puedes completar después en la edición.
        </p>
      </header>

      <ProductCreateForm brandOptions={brandOptions} familyOptions={familyOptions} />
    </div>
  );
}
