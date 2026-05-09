"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { setProductCatalogs } from "@/app/admin/settings/actions";
import type { Catalog } from "@/lib/pim/catalogs";

interface CatalogPickerProps {
  productRef: string;
  allCatalogs: Catalog[];
  initialIds: string[];
}

export function CatalogPicker({ productRef, allCatalogs, initialIds }: CatalogPickerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(initialIds));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    setBusy(true);
    setError(null);
    try {
      await setProductCatalogs(productRef, Array.from(next));
      setSavedAt(Date.now());
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      // Revert
      setSelected(selected);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-medium text-lg">Catálogos de publicación</h3>
        {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {!busy && savedAt && (
          <span className="text-xs text-emerald-600">✓ Guardado</span>
        )}
      </div>

      {allCatalogs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay catálogos creados todavía.{" "}
          <a href="/admin/settings/catalogs" className="text-accent hover:underline">
            Crea el primero →
          </a>
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {allCatalogs.map((c) => {
            const active = selected.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                disabled={busy}
                onClick={() => toggle(c.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-foreground"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full ring-1 ring-foreground/10"
                  style={{ background: c.color ?? "#fa2ca2" }}
                  aria-hidden
                />
                {c.name}
                {active && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <p className="text-xs text-muted-foreground">
        Marca en qué áreas de la web debe aparecer este producto. Se guarda automáticamente.
      </p>
    </div>
  );
}
