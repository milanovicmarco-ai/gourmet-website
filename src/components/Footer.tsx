"use client";

import { useState } from "react";
import Link from "next/link";
import { Instagram, MapPin, MessageCircle, ChevronDown } from "lucide-react";
import { WHATSAPP_LINK, INSTAGRAM, GOOGLE_BUSINESS_URL } from "@/lib/contact";
import { useI18n } from "@/lib/i18n";

const socials = [
  { href: INSTAGRAM, label: "Instagram", icon: Instagram },
  { href: GOOGLE_BUSINESS_URL, label: "Google Maps", icon: MapPin },
  { href: WHATSAPP_LINK, label: "WhatsApp", icon: MessageCircle },
];

export const Footer = () => {
  const { t } = useI18n();
  const nav = [
    {
      title: t("Productos"),
      links: [
        { to: "/catalogo", label: t("Catálogo") },
        { to: "/secrets-du-xef", label: t("Secrets du Xef") },
        { to: "/colmado", label: t("Colmado") },
        { to: "/inspiracion", label: t("Inspiración") },
      ],
    },
    {
      title: t("Gourmet"),
      links: [
        { to: "/quesos", label: t("Fromages") },
        { to: "/catalogo?catalog=delicatessen", label: t("Delicatessen") },
        { to: "/catalogo?catalog=healthy", label: t("Healthy") },
        { to: "/catalogo?catalog=limited-edition", label: t("Limited Edition") },
      ],
    },
    {
      title: t("Aurellano"),
      links: [
        { to: "/sobre-nosotros", label: t("Historia") },
        { to: "/sobre-nosotros", label: t("Misión y visión") },
        { to: "/contacto", label: t("Contacto") },
      ],
    },
  ];

  // Estado del acordeón (mobile): qué columna está abierta. null = todas cerradas.
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  return (
    <footer
      style={{
        position: "relative",
        background: "#080808",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          position: "relative",
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "clamp(60px, 7vw, 96px) clamp(24px, 5vw, 64px) 0",
        }}
      >
        {/* TOP */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.6fr)",
            gap: "clamp(32px, 5vw, 64px)",
            paddingBottom: "48px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
          className="aurellano-footer-top"
        >
          {/* Columna izquierda: naming + descripción + socials */}
          <div className="aurellano-footer-brand">
            <p
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 700,
                fontSize: "11px",
                letterSpacing: ".22em",
                textTransform: "uppercase",
                color: "#ffffff",
                marginBottom: "18px",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#fa2ca2",
                  flexShrink: 0,
                }}
              />
              <span>
                {t("Aurellano")}{" "}
                <span style={{ color: "#fa2ca2" }}>{t("Productos")}</span>{" "}
                {t("Gastronómicos")}
              </span>
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "rgba(255,255,255,0.55)",
                lineHeight: 1.7,
                marginBottom: "30px",
                maxWidth: "340px",
              }}
              className="aurellano-footer-desc"
            >
              {t("Especialistas en distribución de productos gourmet para restaurantes, hoteles y tiendas especializadas.")}
            </p>

            <div className="aurellano-footer-socials" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {socials.map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "9px 16px",
                    borderRadius: "100px",
                    border: "1px solid rgba(255,255,255,0.14)",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.5)",
                    textDecoration: "none",
                    transition: "border-color .2s, color .2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#fa2ca2";
                    e.currentTarget.style.color = "#fa2ca2";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                  }}
                >
                  <Icon size={13} />
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Columnas de navegación: grid de 3 en desktop, acordeón vertical en mobile. */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "32px",
              alignSelf: "start",
            }}
            className="aurellano-footer-nav"
          >
            {nav.map((col) => {
              const isOpen = openAccordion === col.title;
              return (
                <div key={col.title} className="aurellano-footer-col">
                  <button
                    type="button"
                    onClick={() => setOpenAccordion(isOpen ? null : col.title)}
                    aria-expanded={isOpen}
                    className="aurellano-footer-col-title"
                    style={{
                      // Comportamiento default (desktop): label estático con barrita rosa.
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: 700,
                      fontSize: "9px",
                      letterSpacing: ".22em",
                      textTransform: "uppercase",
                      color: "#fa2ca2",
                      marginBottom: "18px",
                      width: "100%",
                      background: "transparent",
                      border: 0,
                      padding: 0,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          width: "14px",
                          height: "1px",
                          background: "#fa2ca2",
                          flexShrink: 0,
                        }}
                      />
                      {col.title}
                    </span>
                    <ChevronDown
                      size={14}
                      className="aurellano-footer-chevron"
                      style={{
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform .25s",
                      }}
                    />
                  </button>
                  <ul
                    className="aurellano-footer-links"
                    data-open={isOpen ? "true" : "false"}
                    style={{
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: "11px",
                      padding: 0,
                      margin: 0,
                    }}
                  >
                    {col.links.map((l) => (
                      <li key={l.label}>
                        <Link
                          href={l.to}
                          style={{
                            fontSize: "13px",
                            color: "rgba(255,255,255,0.42)",
                            textDecoration: "none",
                            transition: "color .15s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.42)")}
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM */}
        <div
          className="aurellano-footer-bottom"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            padding: "24px 0",
          }}
        >
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.22)" }}>
            © {new Date().getFullYear()} {t("Aurellano Productos Gastronómicos")} · Lleida, Catalunya
            {" · "}
            {t("Designed by")}{" "}
            <a
              href="https://www.thecuina.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "rgba(255,255,255,0.5)",
                textDecoration: "none",
                transition: "color .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fa2ca2")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            >
              The Cuina AI
            </a>
          </p>
          <div style={{ display: "flex", gap: "22px" }}>
            {[t("Privacidad"), t("Condiciones"), t("Cookies")].map((label) => (
              <Link
                key={label}
                href="/condiciones"
                style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.3)",
                  textDecoration: "none",
                  transition: "color .15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Franja rosa full width */}
      <div
        aria-hidden
        style={{
          height: "3px",
          background:
            "linear-gradient(90deg, #fa2ca2 0%, rgba(250,44,162,0.25) 60%, transparent 100%)",
        }}
      />

      <style>{`
        /* Desktop: la flecha del acordeón no aplica (las listas siempre visibles). */
        .aurellano-footer-chevron { display: none; }
        .aurellano-footer-col-title { cursor: default !important; }

        @media (max-width: 880px) {
          .aurellano-footer-top {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
            text-align: center;
          }
          .aurellano-footer-brand {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .aurellano-footer-desc {
            max-width: 480px !important;
          }
          .aurellano-footer-socials {
            justify-content: center;
          }
          .aurellano-footer-nav {
            grid-template-columns: 1fr !important;
            gap: 0 !important;
          }
          .aurellano-footer-col {
            border-top: 1px solid rgba(255,255,255,0.08);
            padding: 16px 0;
          }
          .aurellano-footer-col-title {
            margin-bottom: 0 !important;
            cursor: pointer !important;
            justify-content: space-between !important;
          }
          .aurellano-footer-chevron {
            display: inline-block !important;
            color: rgba(255,255,255,0.4);
          }
          .aurellano-footer-links {
            max-height: 0;
            overflow: hidden;
            opacity: 0;
            margin: 0 !important;
            transition: max-height .3s ease, opacity .2s ease, margin .3s ease;
          }
          .aurellano-footer-links[data-open="true"] {
            max-height: 400px;
            opacity: 1;
            margin-top: 14px !important;
          }
          .aurellano-footer-bottom {
            flex-direction: column;
            text-align: center;
            gap: 12px !important;
          }
        }
      `}</style>
    </footer>
  );
};
