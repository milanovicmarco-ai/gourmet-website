import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/integrations/supabase/server";
import { listAllInspirationCatalogs } from "@/lib/pim/inspiration";
import { InspirationManager } from "./inspiration-manager";

export const dynamic = "force-dynamic";

export default async function SettingsInspirationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const items = await listAllInspirationCatalogs().catch(() => []);

  return (
    <div className="px-5 md:px-10 py-8 space-y-8 max-w-5xl">
      <Link
        href="/admin/settings"
        className="text-xs text-muted-foreground hover:text-accent transition-colors uppercase tracking-[0.18em]"
      >
        ← Volver a settings
      </Link>

      <header>
        <p className="eyebrow">PIM · Settings · Inspiración</p>
        <h1 className="font-display font-light text-3xl md:text-4xl tracking-tight mt-1">
          Catálogos de inspiración
        </h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-3xl">
          Sube los PDFs de catálogos y colecciones que quieras enseñar en{" "}
          <code>/inspiracion</code>. Cada uno necesita PDF, carátula (imagen) y
          opcionalmente un logo. El orden aparece en la web tal y como lo
          configures aquí (menor número = más arriba).
        </p>
      </header>

      <InspirationManager items={items} />
    </div>
  );
}
