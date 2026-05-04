import { useEffect } from "react";
import { useLocation } from "react-router-dom";
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
}

export const Layout = ({ children, navTheme = "light", heroFlush = false }: LayoutProps) => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
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
