"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, MessageCircle, ChevronDown, Globe } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { WHATSAPP_LINK } from "@/lib/contact";
import { useNavTheme } from "@/lib/nav-theme";
import { useI18n } from "@/lib/i18n";
import { getEquivalentPath, ROUTES } from "@/lib/i18n/routes";

type LinkItem = {
  to: string;
  label: string;
  children?: { to: string; label: string }[];
};

const buildLinks = (t: (k: string) => string, lang: "es" | "ca"): LinkItem[] => [
  { to: ROUTES.catalogo[lang], label: t("Catálogo") },
  { to: ROUTES.secrets[lang], label: t("Secrets du Xef") },
  { to: ROUTES.colmado[lang], label: t("Colmado") },
  // "Cheese lovers" es la única especialidad enlazada en el menú principal.
  // El resto (delicatessen, healthy, limited-edition) siguen accesibles vía /catalogo?catalog=…
  // pero no aparecen como dropdown porque Marco lo prefiere así.
  { to: ROUTES.quesos[lang], label: t("Cheese lovers") },
  { to: ROUTES.inspirate[lang], label: t("Inspírate") },
  { to: ROUTES.sobre[lang], label: t("Aurellano") },
];

const LangSwitcher = ({ isDark }: { isDark: boolean }) => {
  const { lang } = useI18n();
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  const switchTo = (target: "es" | "ca") => {
    if (target === lang) return;
    const next = getEquivalentPath(pathname, target);
    router.push(next);
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1 py-1 text-[11px] font-semibold uppercase tracking-wider",
        isDark ? "border-white/30 text-white" : "border-border text-foreground",
      )}
      role="group"
      aria-label="Idioma"
    >
      <Globe className="h-3 w-3 mx-1 opacity-70" />
      <button
        type="button"
        onClick={() => switchTo("es")}
        className={cn(
          "px-2 py-0.5 rounded-full transition-colors",
          lang === "es" ? "bg-accent text-accent-foreground" : "hover:text-accent",
        )}
        aria-pressed={lang === "es"}
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => switchTo("ca")}
        className={cn(
          "px-2 py-0.5 rounded-full transition-colors",
          lang === "ca" ? "bg-accent text-accent-foreground" : "hover:text-accent",
        )}
        aria-pressed={lang === "ca"}
      >
        CA
      </button>
    </div>
  );
};

export const Nav = () => {
  const [open, setOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const theme = useNavTheme();
  const isDark = theme === "dark";
  const pathname = usePathname();
  const { t, lang } = useI18n();
  const links = buildLinks(t, lang);

  const isActive = (to: string) => {
    const target = to.split("?")[0];
    if (target === "/") return pathname === target;
    return pathname.startsWith(target);
  };

  return (
    <header
      className={cn(
        // Siempre absolute para que el contenido empiece desde y=0 con su propio
        // fondo (gradientes, imágenes, color). Las páginas deben reservar espacio
        // con pt-24 md:pt-32 en su primera sección para que no se solape el contenido.
        "absolute top-0 inset-x-0 z-40",
      )}
    >
      <div className="container-edit flex items-center justify-between h-16 md:h-20">
        <Logo />
        <nav className="hidden lg:flex items-center gap-8" aria-label={t("Principal")}>
          {links.map((l) => {
            if (l.children) {
              return (
                <div
                  key={l.label}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(l.label)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1 text-[15px] font-bold tracking-tight transition-colors py-1 hover:text-accent",
                      isDark ? "text-white" : "text-foreground",
                    )}
                  >
                    {l.label}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {openDropdown === l.label && (
                    <div className="absolute left-0 top-full pt-3 min-w-[220px]">
                      <div className="bg-background border border-border rounded-xl shadow-soft py-2">
                        {l.children.map((c) => (
                          <Link
                            key={c.to}
                            href={c.to}
                            className="block px-4 py-2 text-sm text-foreground hover:bg-secondary hover:text-accent transition-colors"
                          >
                            {c.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            const active = isActive(l.to);
            return (
              <Link
                key={l.to}
                href={l.to}
                className={cn(
                  "text-[15px] font-bold tracking-tight transition-colors relative py-1 hover:text-accent",
                  active && "text-accent",
                  !active && (isDark ? "text-white" : "text-foreground"),
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <LangSwitcher isDark={isDark} />
          <Link
            href="/contacto"
            className="hidden md:inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-foreground rounded-full px-5 py-2.5 hover:bg-accent/90 transition-colors duration-300"
          >
            {t("Contacto")}
          </Link>
          <button
            type="button"
            className={cn("lg:hidden p-2 -mr-2 transition-colors", isDark ? "text-white" : "text-foreground")}
            onClick={() => setOpen((v) => !v)}
            aria-label={t("Abrir menú")}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "lg:hidden overflow-hidden transition-[max-height,opacity] duration-500 bg-background border-b border-border",
          open ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <nav className="container-edit py-6 flex flex-col gap-1" aria-label={t("Móvil")}>
          {links.map((l) => (
            <div key={l.label}>
              <Link
                href={l.to}
                onClick={() => setOpen(false)}
                className="block text-2xl font-display font-light tracking-tight py-3 border-b border-border/60"
              >
                {l.label}
              </Link>
              {l.children && (
                <div className="pl-4 pb-2">
                  {l.children.map((c) => (
                    <Link
                      key={c.to}
                      href={c.to}
                      onClick={() => setOpen(false)}
                      className="block text-base text-muted-foreground py-2"
                    >
                      → {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground rounded-full py-3.5 font-medium"
          >
            <MessageCircle className="h-5 w-5" /> {t("Hablar por WhatsApp")}
          </a>
        </nav>
      </div>
    </header>
  );
};
