"use client";

import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useConsent } from "@/components/consent/ConsentProvider";

const cookieRows = [
  {
    name: "aurellano_consent",
    purpose: "Guarda tu elección de cookies para no volver a preguntarte.",
    duration: "Hasta 12 meses",
    provider: "Propia",
  },
  {
    name: "_ga",
    purpose: "Distingue usuarios de forma anónima para medir el uso de la web.",
    duration: "Hasta 13 meses",
    provider: "Google Analytics",
  },
  {
    name: "_ga_<container-id>",
    purpose: "Distingue usuarios de forma anónima para medir el uso de la web.",
    duration: "Hasta 13 meses",
    provider: "Google Analytics",
  },
  {
    name: "_gid",
    purpose: "Limita la frecuencia de las peticiones a Google Analytics.",
    duration: "Hasta 24 horas",
    provider: "Google Analytics",
  },
];

const Cookies = () => {
  const t = useT();
  const { openPreferences } = useConsent();

  return (
    <Layout
      seoTitle="Política de Cookies | Aurellano P. Gastronómicos"
      seoDescription="Qué cookies utiliza aurellano.com, con qué finalidad y cómo puedes gestionarlas."
    >
      <section className="relative overflow-hidden">
        <Circle variant="accent" className="w-72 h-72 -top-10 -right-20" />
        <div className="container-edit pt-12 md:pt-20 pb-12 max-w-4xl space-y-6 relative">
          <p className="eyebrow">{t("Cookies")}</p>
          <h1 className="display text-balance">{t("Política de Cookies")}</h1>
        </div>
      </section>

      <section className="container-edit pb-12 max-w-3xl space-y-4">
        <h2 className="font-display font-medium text-xl">{t("¿Qué son las cookies?")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t(
            "Las cookies son pequeños archivos que se guardan en tu navegador cuando visitas una web. Nos ayudan a recordar tu elección de cookies y, si nos das permiso, a entender cómo se usa la web para mejorarla."
          )}
        </p>
        <Button onClick={openPreferences} className="h-auto whitespace-normal py-3 text-center">
          {t("Gestionar mis preferencias de cookies")}
        </Button>
      </section>

      <section className="container-edit pb-24 md:pb-32 max-w-3xl space-y-4">
        <h2 className="font-display font-medium text-xl">{t("Cookies que utilizamos")}</h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50 text-left">
                <th className="p-3 font-medium">{t("Nombre")}</th>
                <th className="p-3 font-medium">{t("Finalidad")}</th>
                <th className="p-3 font-medium">{t("Duración")}</th>
                <th className="p-3 font-medium">{t("Proveedor")}</th>
              </tr>
            </thead>
            <tbody>
              {cookieRows.map((row) => (
                <tr key={row.name} className="border-b border-border last:border-0">
                  <td className="p-3 font-mono text-xs">{row.name}</td>
                  <td className="p-3 text-muted-foreground">{t(row.purpose)}</td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{t(row.duration)}</td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{t(row.provider)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("Solo se instalan si aceptas la categoría \"Analítica\" en el panel de cookies.")}
        </p>
      </section>
    </Layout>
  );
};

export default Cookies;
