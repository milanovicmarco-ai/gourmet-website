import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/integrations/supabase/server";
import { LogoutButton } from "./logout-button";

export const metadata: Metadata = {
  title: "Admin · PIM Aurellano",
  description: "Dashboard interno de gestión de catálogo.",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Si no está autenticado y no estamos ya en /admin/login → redirigir.
  // Como este layout aplica a /admin/login también, dejamos pasar el caso login.
  // Detectamos eso de forma simple: si no hay user, sólo el contenido de /admin/login se renderiza
  // (la página de login no consulta auth). Para evitar bucles redirigimos en /admin/page.tsx
  // y en /admin/products/* si hace falta. Aquí mostramos shell + contenido.

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-secondary/30">
        <div className="px-6 py-6 border-b border-border">
          <Link href="/admin" className="font-display font-light text-2xl tracking-tight">
            Aurellano <span className="text-accent">PIM</span>
          </Link>
          <p className="text-xs text-muted-foreground uppercase tracking-[0.18em] mt-1">v1</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
          <Link
            href="/admin/products"
            className="block px-3 py-2 rounded-lg text-foreground hover:bg-background hover:text-accent transition-colors"
          >
            Productos
          </Link>
          <Link
            href="/admin/settings/catalogs"
            className="block px-3 py-2 rounded-lg text-foreground hover:bg-background hover:text-accent transition-colors"
          >
            Catálogos
          </Link>
          <Link
            href="/admin/settings"
            className="block px-3 py-2 rounded-lg text-foreground hover:bg-background hover:text-accent transition-colors"
          >
            Settings
          </Link>
        </nav>
        <div className="px-4 py-4 border-t border-border">
          {user ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              <LogoutButton />
            </div>
          ) : (
            <Link href="/admin/login" className="text-xs text-accent">
              Iniciar sesión →
            </Link>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden px-5 py-4 border-b border-border flex items-center justify-between">
          <Link href="/admin" className="font-display font-light text-lg">
            Aurellano <span className="text-accent">PIM</span>
          </Link>
          {user ? <LogoutButton /> : <Link href="/admin/login" className="text-sm text-accent">Login</Link>}
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
