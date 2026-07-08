"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useConsent } from "./ConsentProvider";
import type { ConsentState } from "@/lib/consent";

export function CookieBanner() {
  const t = useT();
  const { consent, preferencesOpen, acceptAll, rejectAll, savePreferences, openPreferences, closePreferences } =
    useConsent();

  // Sin decisión previa → banner de primera visita.
  // Decisión previa pero el usuario reabre "Preferencias" desde el footer → panel directo.
  const showBanner = consent === null && !preferencesOpen;
  const showPanel = preferencesOpen || consent === null;

  if (!showBanner && !showPanel) return null;

  return (
    <>
      {showBanner && !preferencesOpen && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label={t("Uso de cookies")}
          className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-background px-5 py-5 shadow-[0_-4px_24px_rgba(0,0,0,0.15)] sm:px-8"
        >
          <div className="container-edit flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground max-w-2xl">
              {t(
                "Usamos cookies propias y de terceros para analizar el tráfico de la web. Puedes aceptarlas, rechazarlas o personalizar tu elección en cualquier momento."
              )}{" "}
              <Link href="/cookies" className="underline underline-offset-2 text-foreground">
                {t("Más información")}
              </Link>
            </p>
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              <Button variant="outline" size="sm" onClick={rejectAll}>
                {t("Rechazar todo")}
              </Button>
              <Button variant="outline" size="sm" onClick={openPreferences}>
                {t("Personalizar")}
              </Button>
              <Button size="sm" onClick={acceptAll}>
                {t("Aceptar todo")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPanel && preferencesOpen && (
        <PreferencesPanel
          onClose={consent === null ? undefined : closePreferences}
          onAcceptAll={acceptAll}
          onRejectAll={rejectAll}
          onSave={savePreferences}
        />
      )}
    </>
  );
}

function PreferencesPanel({
  onClose,
  onAcceptAll,
  onRejectAll,
  onSave,
}: {
  /** undefined cuando todavía no hay decisión previa: no se puede cerrar sin elegir. */
  onClose?: () => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onSave: (state: ConsentState) => void;
}) {
  const t = useT();
  const { consent } = useConsent();
  const [analytics, setAnalytics] = useState(consent?.analytics ?? false);
  const [marketing, setMarketing] = useState(consent?.marketing ?? false);

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
      <div className="w-full max-w-lg rounded-t-2xl border border-border bg-background p-6 shadow-2xl sm:rounded-2xl sm:p-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{t("Preferencias de cookies")}</p>
            <h2 className="text-lg font-semibold text-foreground mt-1">{t("Elige qué cookies aceptas")}</h2>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t("Cerrar")}
              className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          <CategoryRow
            title={t("Cookies necesarias")}
            description={t("Imprescindibles para que la web funcione (navegación, seguridad). No se pueden desactivar.")}
            checked
            disabled
          />
          <CategoryRow
            title={t("Cookies analíticas")}
            description={t("Nos permiten medir visitas y uso de la web (Google Analytics) para mejorarla.")}
            checked={analytics}
            onChange={setAnalytics}
          />
          <CategoryRow
            title={t("Cookies de marketing")}
            description={t("Se usarían para medir campañas y mostrar contenido relevante en otras webs.")}
            checked={marketing}
            onChange={setMarketing}
          />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          {t("Consulta más detalle en nuestra")}{" "}
          <Link href="/cookies" className="underline underline-offset-2">
            {t("Política de Cookies")}
          </Link>
          .
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" size="sm" onClick={onRejectAll}>
            {t("Rechazar todo")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onSave({ analytics, marketing })}>
            {t("Guardar preferencias")}
          </Button>
          <Button size="sm" onClick={onAcceptAll}>
            {t("Aceptar todo")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <label className="relative inline-flex shrink-0 cursor-pointer items-center mt-0.5">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        <div className="h-6 w-11 rounded-full bg-secondary peer-checked:bg-accent peer-disabled:opacity-50 transition-colors after:absolute after:left-[3px] after:top-[3px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
      </label>
    </div>
  );
}
