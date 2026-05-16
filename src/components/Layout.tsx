"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { FloatingActions } from "./FloatingActions";
import { NavTheme, NavThemeContext } from "@/lib/nav-theme";

interface LayoutProps {
  children: React.ReactNode;
  /** "dark" = nav blanco sobre fondo oscuro/imagen (nav absolute superpuesto al hero);
   *  "light" = nav negro sobre fondo claro (nav relative, ocupa su espacio en flujo). */
  navTheme?: NavTheme;
  /** Legacy: se mantiene en la API por retrocompat con páginas que lo pasan.
   *  No se usa internamente — el espacio bajo el nav lo controla el nav theme
   *  (absolute en dark, relative en light). */
  heroFlush?: boolean;
  /** Compatibilidad legacy. En Next.js los metadatos los gestiona `export const metadata` en `page.tsx`. */
  seoTitle?: string;
  seoDescription?: string;
}

export const Layout = ({
  children,
  navTheme = "light",
  // heroFlush, seoTitle y seoDescription se aceptan por compat pero no hacen nada:
  // - los metadatos van vía Next.js Metadata API en cada page.tsx;
  // - el padding superior está implícito en el theme del nav (absolute vs relative).
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
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingActions />
      </div>
    </NavThemeContext.Provider>
  );
};
