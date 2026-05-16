import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/integrations/supabase/server";
import { Tags, Layers, Boxes, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsIndexPage() {
  // Skip Supabase auth completamente cuando DEV_BYPASS_ADMIN_AUTH=1 — evita
  // el lookup DNS lento si el proyecto Supabase no está configurado.
  let user: { email?: string | null } | null = null;
  if (process.env.DEV_BYPASS_ADMIN_AUTH !== "1") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
    if (!user) redirect("/admin/login");
  }

  const cards = [
    {
      href: "/admin/settings/catalogs",
      title: "Catálogos",
      description: "Define en qué áreas de la web aparece cada producto (HORECA, Retail, Especial Sin…).",
      icon: Boxes,
      ready: true,
    },
    {
      href: "/admin/settings/families",
      title: "Familias",
      description: "Reetiqueta, reordena o desactiva las familias auto-descubiertas desde la API.",
      icon: Layers,
      ready: true,
    },
    {
      href: "/admin/settings/brands",
      title: "Marcas",
      description: "Listado deduplicado de marcas distribuidas. Renombra, unifica o desasigna en bulk.",
      icon: Tags,
      ready: true,
    },
    {
      href: "/admin/settings/inspiration",
      title: "Inspiración",
      description: "Portfolio público de catálogos PDF. Sube PDF + carátula + logo y aparecen en /inspiracion.",
      icon: BookOpen,
      ready: true,
    },
  ];

  return (
    <div className="px-5 md:px-10 py-8 space-y-8 max-w-4xl">
      <header>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">PIM · Configuración</p>
        <h1 className="font-display font-light text-3xl md:text-4xl tracking-tight mt-1">Settings</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Configura las taxonomías que organizan tu catálogo y deciden dónde se muestra cada producto.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map((c) => {
          const Cmp: React.ElementType = c.ready ? Link : "div";
          const props = c.ready ? { href: c.href } : {};
          return (
            <Cmp
              key={c.title}
              {...props}
              className={`block rounded-2xl border border-border p-6 transition-colors ${
                c.ready
                  ? "bg-background hover:border-accent hover:bg-secondary/40"
                  : "bg-secondary/30 opacity-70 cursor-not-allowed"
              }`}
            >
              <c.icon className="h-7 w-7 text-accent mb-4" strokeWidth={1.5} />
              <h2 className="font-display font-medium text-xl">{c.title}</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{c.description}</p>
              {!c.ready && (
                <p className="text-xs text-muted-foreground mt-3 uppercase tracking-wider">
                  Próximamente
                </p>
              )}
            </Cmp>
          );
        })}
      </div>
    </div>
  );
}
