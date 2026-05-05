"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { FloatingActions } from "./FloatingActions";
import { NavTheme, NavThemeContext } from "@/lib/nav-theme";

interface LayoutProps {
  children: React.ReactNode;
  /** "dark" = nav blanco sobre fondo oscuro/imagen; "light" = nav negro sobre fondo claro */
  navTheme?: NavTheme;
  /** Si true, el contenido empieza pegado arriba (hero full-bleed). Si false, deja padding superior. */
  heroFlush?: boolean;
  /** Compatibilidad legacy. En Next.js los metadatos los gestiona `export const metadata` en `page.tsx`. */
  seoTitle?: string;
  seoDescription?: string;
}

export const Layout = ({
  children,
  navTheme = "light",
  heroFlush = false,
  // seoTitle y seoDescription se aceptan por compatibilidad pero no hacen nada:
  // los metadatos se gestionan vía Next.js Metadata API en cada page.tsx.
}: LayoutProps) => {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [pathname]);

  return (
    <NavThemeContext.Provider value={navTheme}>
      <div className="min-h-screen flex flex-col bg-background">
        <Nav />
        <main className={heroFlush ? "flex-1" : "flex-1 pt-16 md:pt-20"}>{children}</main>
        <Footer />
        <FloatingActions />
      </div>
    </NavThemeContext.Provider>
  );
};
