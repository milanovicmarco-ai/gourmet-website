import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/integrations/supabase/server";
import { listBrands, listFamiliesEntities } from "@/lib/pim/api";
import { ProductCreateForm } from "./create-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  // Skip Supabase auth completamente cuando DEV_BYPASS_ADMIN_AUTH=1 — evita
  // el lookup DNS lento si el proyecto Supabase no está configurado.
  let user: { email?: string | null } | null = null;
  if (process.env.DEV_BYPASS_ADMIN_AUTH !== "1") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
    if (!user) redirect("/admin/login");
  }

  const [brands, families] = await Promise.all([
    listBrands().catch(() => []),
    listFamiliesEntities().catch(() => []),
  ]);

  const brandOptions = brands.map((b) => ({ slug: b.slug, name: b.name }));
  const familyOptions = families
    .filter((f) => f.is_entity !== false)
    .map((f) => ({ slug: f.slug, name: f.name }));

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
          Asigna la <code>ref</code> (código interno de Aurellano), familia y opcionalmente la
          marca. La imagen, descripciones, alérgenos y SEO los completas después en la edición.
        </p>
      </header>

      <ProductCreateForm
        brandOptions={brandOptions}
        familyOptions={familyOptions}
      />
    </div>
  );
}
