"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Check, X, Plus } from "lucide-react";
import { upsertFamilyMeta, deleteFamilyMeta } from "../actions";
import type { FamilyMeta } from "@/lib/pim/catalogs";

type Row = {
  slug: string;
  count: number;
  meta: FamilyMeta | null;
  ghost: boolean;
};

type LocalRow = {
  slug: string;
  count: number;
  ghost: boolean;
  display_name: string;
  description: string;
  sort_order: number;
  active: boolean;
  dirty: boolean;
  savedAt: number | null;
  error: string | null;
};

/** Normaliza slug: mayúsculas, sin acentos, espacios → guion bajo. Coincide con
 * el formato que la API del socio usa típicamente para families (QUESOS, FOIE_GRAS). */
const normalizeFamilySlug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");

export function FamiliesEditor({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<LocalRow[]>(
    rows.map((r) => ({
      slug: r.slug,
      count: r.count,
      ghost: r.ghost,
      display_name: r.meta?.display_name ?? "",
      description: r.meta?.description ?? "",
      sort_order: r.meta?.sort_order ?? 0,
      active: r.meta?.active ?? true,
      dirty: false,
      savedAt: null,
      error: null,
    })),
  );

  // Formulario de "Nueva familia"
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  function createFamily() {
    setCreateError(null);
    const slug = normalizeFamilySlug(newSlug || newName);
    if (!slug) {
      setCreateError("Introduce un nombre o slug.");
      return;
    }
    if (items.some((it) => it.slug === slug)) {
      setCreateError(`La familia "${slug}" ya existe.`);
      return;
    }
    const display = newName.trim() || slug;
    const maxOrder = items.reduce((m, it) => Math.max(m, it.sort_order), 0);
    startTransition(async () => {
      try {
        await upsertFamilyMeta({
          slug,
          display_name: display,
          description: null,
          sort_order: maxOrder + 1,
          active: true,
        });
        setItems((xs) => [
          ...xs,
          {
            slug,
            count: 0,
            ghost: true,
            display_name: display,
            description: "",
            sort_order: maxOrder + 1,
            active: true,
            dirty: false,
            savedAt: Date.now(),
            error: null,
          },
        ]);
        setNewSlug("");
        setNewName("");
        router.refresh();
      } catch (e) {
        setCreateError((e as Error).message);
      }
    });
  }

  function removeGhost(idx: number) {
    const r = items[idx];
    if (!r.ghost) return;
    if (
      !confirm(
        `¿Eliminar la familia "${r.slug}" del overlay? Sólo se borra la fila de overlay (no afecta a la API).`,
      )
    )
      return;
    startTransition(async () => {
      try {
        await deleteFamilyMeta(r.slug);
        setItems((xs) => xs.filter((_, i) => i !== idx));
        router.refresh();
      } catch (e) {
        setItems((xs) =>
          xs.map((it, i) => (i === idx ? { ...it, error: (e as Error).message } : it)),
        );
      }
    });
  }

  function patch(idx: number, p: Partial<LocalRow>) {
    setItems((xs) =>
      xs.map((it, i) => (i === idx ? { ...it, ...p, dirty: true, savedAt: null, error: null } : it)),
    );
  }

  async function saveRow(idx: number) {
    const r = items[idx];
    startTransition(async () => {
      try {
        await upsertFamilyMeta({
          slug: r.slug,
          display_name: r.display_name || null,
          description: r.description || null,
          sort_order: r.sort_order,
          active: r.active,
        });
        setItems((xs) =>
          xs.map((it, i) =>
            i === idx ? { ...it, dirty: false, savedAt: Date.now(), error: null } : it,
          ),
        );
        router.refresh();
      } catch (e) {
        setItems((xs) =>
          xs.map((it, i) => (i === idx ? { ...it, error: (e as Error).message } : it)),
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Bloque de creación */}
      <div className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-4">
        <div>
          <h2 className="font-display font-medium text-lg">Crear familia nueva</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Genera una familia en el overlay para tener su etiqueta y orden listos.
            Asocia productos a su slug desde el editor del PIM (campo &ldquo;Familia&rdquo;).
          </p>
        </div>
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Display name</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (!newSlug) setNewSlug(normalizeFamilySlug(e.target.value));
              }}
              placeholder="ej. Quesos afinados"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Slug (mayúsculas, sin espacios)</span>
            <input
              type="text"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value.toUpperCase())}
              onBlur={(e) => setNewSlug(normalizeFamilySlug(e.target.value))}
              placeholder="QUESOS_AFINADOS"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={createFamily}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60 h-fit"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Crear familia
          </button>
        </div>
        {createError && <p className="text-sm text-destructive">{createError}</p>}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No hay familias todavía. Crea una arriba o pide al socio que cree productos
          en la API — aparecerán aquí automáticamente.
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40">
              <tr className="text-left">
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Slug</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Display name</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Descripción</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground w-20">Orden</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground w-24">Productos</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground w-20">Activa</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((r, i) => (
                <tr key={r.slug} className={r.active ? "" : "opacity-50"}>
                  <td className="px-4 py-3 font-mono text-xs">
                    {r.slug}
                    {r.ghost && (
                      <span className="ml-2 inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/20">
                        Sin productos
                      </span>
                    )}
                  </td>
              <td className="px-4 py-3">
                <input
                  type="text"
                  value={r.display_name}
                  onChange={(e) => patch(i, { display_name: e.target.value })}
                  placeholder={r.slug}
                  className="w-full bg-transparent border-b border-transparent focus:border-accent focus:outline-none py-1"
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="text"
                  value={r.description}
                  onChange={(e) => patch(i, { description: e.target.value })}
                  placeholder="—"
                  className="w-full bg-transparent border-b border-transparent focus:border-accent focus:outline-none py-1"
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  value={r.sort_order}
                  onChange={(e) => patch(i, { sort_order: Number(e.target.value) || 0 })}
                  className="w-16 bg-transparent border-b border-transparent focus:border-accent focus:outline-none py-1 tabular-nums"
                />
              </td>
              <td className="px-4 py-3 text-muted-foreground tabular-nums">{r.count}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => patch(i, { active: !r.active })}
                  className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${
                    r.active
                      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                      : "bg-secondary text-muted-foreground border-border"
                  }`}
                >
                  {r.active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {r.active ? "Sí" : "No"}
                </button>
              </td>
              <td className="px-4 py-3 text-right">
                {r.error && <p className="text-xs text-destructive mb-1">{r.error}</p>}
                {r.dirty ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => saveRow(i)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors disabled:opacity-60"
                  >
                    {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Guardar
                  </button>
                ) : r.ghost ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => removeGhost(i)}
                    className="inline-flex items-center gap-1 rounded-full border border-destructive/30 text-destructive px-3 py-1.5 text-xs font-medium hover:bg-destructive/5 disabled:opacity-50"
                  >
                    <X className="h-3 w-3" /> Eliminar
                  </button>
                ) : r.savedAt ? (
                  <span className="text-xs text-emerald-600">✓ Guardado</span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>
      )}
    </div>
  );
}
