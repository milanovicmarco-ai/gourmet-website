import { useState } from "react";
import { NavLink as RNavLink, Link } from "react-router-dom";
import { Menu, X, MessageCircle, ChevronDown, Globe } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { WHATSAPP_LINK } from "@/lib/contact";
import { useNavTheme } from "@/lib/nav-theme";
import { useI18n } from "@/lib/i18n";

type LinkItem = {
  to: string;
  label: string;
  children?: { to: string; label: string }[];
};

const buildLinks = (t: (k: string) => string): LinkItem[] => [
  { to: "/catalogo", label: t("Catálogo") },
  { to: "/secrets-du-xef", label: t("Secrets du Xef") },
  { to: "/colmado", label: t("Colmado") },
  {
    to: "/catalogo?especialidad=todas",
    label: t("Especialidades"),
    children: [
      { to: "/quesos", label: t("Quesos") },
      { to: "/catalogo?especialidad=delicatessen", label: t("Delicatessen") },
      { to: "/catalogo?especialidad=healthy", label: t("Healthy Food") },
      { to: "/catalogo?especialidad=limited", label: t("Limited Edition") },
    ],
  },
  { to: "/sobre-nosotros", label: t("Aurellano") },
  { to: "/inspiracion", label: t("Consejos") },
];

const LangSwitcher = ({ isDark }: { isDark: boolean }) => {
  const { lang, setLang } = useI18n();
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
        onClick={() => setLang("es")}
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
        onClick={() => setLang("ca")}
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
  const { t } = useI18n();
  const links = buildLinks(t);

  return (
    <header
      className={cn(
        isDark ? "absolute top-0 inset-x-0 z-40" : "relative z-40 border-b border-border bg-background",
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
                            to={c.to}
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
            return (
              <RNavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "text-[15px] font-bold tracking-tight transition-colors relative py-1 hover:text-accent",
                    isActive && "text-accent",
                    !isActive && (isDark ? "text-white" : "text-foreground"),
                  )
                }
              >
                {l.label}
              </RNavLink>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <LangSwitcher isDark={isDark} />
          <Link
            to="/contacto"
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
                to={l.to}
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
                      to={c.to}
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
