import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/integrations/supabase/server";
import { listFamilies } from "@/lib/pim/api";
import { getFamilyMetas } from "@/lib/pim/catalogs";
import { FamiliesEditor } from "./families-editor";

export const dynamic = "force-dynamic";

export default async function SettingsFamiliesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Source of truth: la API auto-descubre las familias desde los productos.
  // El overlay families_meta (Supabase) añade etiqueta, descripción, orden y
  // permite pre-crear familias que aún no tienen productos asignados (ghosts).
  const [apiFamilies, metas] = await Promise.all([
    listFamilies().catch(() => []),
    getFamilyMetas().catch(() => ({})),
  ]);

  const apiSlugs = new Set(apiFamilies.map((f) => f.family));
  const overlayOnly = Object.keys(metas).filter((slug) => !apiSlugs.has(slug));

  const rows = [
    // Familias detectadas en productos de la API
    ...apiFamilies.map((f) => ({
      slug: f.family,
      count: f.count,
      meta: metas[f.family] ?? null,
      ghost: false,
    })),
    // Familias creadas en settings pero sin productos asignados aún
    ...overlayOnly.map((slug) => ({
      slug,
      count: 0,
      meta: metas[slug],
      ghost: true,
    })),
  ];

  return (
    <div className="px-5 md:px-10 py-8 space-y-8 max-w-5xl">
      <Link
        href="/admin/settings"
        className="text-xs text-muted-foreground hover:text-accent transition-colors uppercase tracking-[0.18em]"
      >
        ← Volver a settings
      </Link>

      <header>
        <p className="eyebrow">PIM · Settings · Familias</p>
        <h1 className="font-display font-light text-3xl md:text-4xl tracking-tight mt-1">
          Familias del catálogo
        </h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-3xl">
          Las familias se descubren automáticamente desde la API ({rows.length}
          {" detectadas"}). Aquí puedes reetiquetarlas para la web (display name),
          añadir descripción, cambiar el orden o desactivarlas para que no
          aparezcan en filtros públicos. El slug interno NO se cambia — viene de
          la API del socio.
        </p>
      </header>

      <FamiliesEditor rows={rows} />
    </div>
  );
}
