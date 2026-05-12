import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/integrations/supabase/server";
import { listCatalogs } from "@/lib/pim/catalogs";
import { CatalogsManager } from "./catalogs-manager";

export const dynamic = "force-dynamic";

export default async function CatalogsSettingsPage() {
  // Skip Supabase auth completamente cuando DEV_BYPASS_ADMIN_AUTH=1 — evita
  // el lookup DNS lento si el proyecto Supabase no está configurado.
  let user: { email?: string | null } | null = null;
  if (process.env.DEV_BYPASS_ADMIN_AUTH !== "1") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
    if (!user) redirect("/admin/login");
  }

  const catalogs = await listCatalogs(true);

  return (
    <div className="px-5 md:px-10 py-8 space-y-8 max-w-4xl">
      <Link
        href="/admin/settings"
        className="text-xs text-muted-foreground hover:text-accent transition-colors uppercase tracking-[0.18em]"
      >
        ← Volver a settings
      </Link>

      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Settings · Catálogos</p>
        <h1 className="font-display font-light text-3xl md:text-4xl tracking-tight mt-1">
          Catálogos de publicación
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Cada catálogo agrupa productos para mostrarlos en una zona concreta de la web (Secrets du Xef =
          HORECA, Colmado = Retail, etc.). Un producto puede pertenecer a varios catálogos a la vez.
        </p>
      </header>

      <CatalogsManager initial={catalogs} />
    </div>
  );
}
