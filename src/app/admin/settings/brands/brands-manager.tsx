"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Trash2, Loader2, Search, RefreshCw } from "lucide-react";
import { renameBrand, deleteBrand } from "../actions";
import { syncBrandsToPartner, type SyncResult } from "./sync-action";

type BrandRow = { canonical: string; count: number; refs: string[] };

export function BrandsManager({
  brands,
  totalProducts,
}: {
  brands: BrandRow[];
  totalProducts: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  async function handleSync() {
    if (!confirm(`Sincronizar ${brands.length} marcas con el catálogo del partner. Puede tardar unos segundos. ¿Continuar?`)) return;
    setSyncing(true);
    setSyncResult(null);
    setMessage(null);
    try {
      const result = await syncBrandsToPartner();
      setSyncResult(result);
      setMessage({
        kind: result.failed.length === 0 ? "ok" : "err",
        text: result.failed.length === 0
          ? `Sincronización completada: ${result.synced.length} marca${result.synced.length === 1 ? "" : "s"} procesadas.`
          : `${result.synced.length} procesadas, ${result.failed.length} con error.`,
      });
    } catch (e) {
      setMessage({ kind: "err", text: (e as Error).message });
    } finally {
      setSyncing(false);
    }
  }

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    if (!qn) return brands;
    return brands.filter((b) => b.canonical.toLowerCase().includes(qn));
  }, [q, brands]);

  function startEdit(b: BrandRow) {
    setEditingId(b.canonical);
    setEditValue(b.canonical);
    setMessage(null);
  }
  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  function commitRename(b: BrandRow) {
    const to = editValue.trim();
    if (!to || to === b.canonical) {
      cancelEdit();
      return;
    }
    startTransition(async () => {
      try {
        const n = await renameBrand(b.canonical, to);
        setMessage({
          kind: "ok",
          text: `Renombrada "${b.canonical}" → "${to}" en ${n} producto${n === 1 ? "" : "s"}.`,
        });
        cancelEdit();
        router.refresh();
      } catch (e) {
        setMessage({ kind: "err", text: (e as Error).message });
      }
    });
  }

  function handleDelete(b: BrandRow) {
    if (
      !confirm(
        `Vas a quitar la marca "${b.canonical}" de ${b.count} producto${
          b.count === 1 ? "" : "s"
        }. Los productos quedan SIN marca asignada. ¿Continuar?`,
      )
    )
      return;
    startTransition(async () => {
      try {
        const n = await deleteBrand(b.canonical);
        setMessage({
          kind: "ok",
          text: `"${b.canonical}" desasignada de ${n} producto${n === 1 ? "" : "s"}.`,
        });
        router.refresh();
      } catch (e) {
        setMessage({ kind: "err", text: (e as Error).message });
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrar marcas…"
            className="w-full bg-background border border-border rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{brands.length}</span> marca{brands.length === 1 ? "" : "s"} ·{" "}
          <span className="font-medium text-foreground">{totalProducts}</span> productos totales
        </p>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing || pending}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-foreground transition-colors disabled:opacity-50"
        >
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {syncing ? "Sincronizando…" : "Sincronizar con partner"}
        </button>
      </div>

      {message && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            message.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {message.text}
          {syncResult && syncResult.failed.length > 0 && (
            <ul className="mt-2 list-disc list-inside space-y-1 text-xs">
              {syncResult.failed.map((f) => (
                <li key={f.name}><strong>{f.name}</strong>: {f.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {brands.length === 0
            ? "No hay marcas asignadas todavía. Edita un producto y rellena el campo 'Marca'."
            : "No hay marcas que coincidan con la búsqueda."}
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40">
              <tr className="text-left">
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Marca</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground w-32">Productos</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground w-40"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((b) => {
                const editing = editingId === b.canonical;
                return (
                  <tr key={b.canonical}>
                    <td className="px-4 py-3">
                      {editing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename(b);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          autoFocus
                          className="w-full bg-background border border-accent rounded-lg px-2 py-1 focus:outline-none"
                        />
                      ) : (
                        <span className="font-medium">{b.canonical}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      <a
                        href={`/admin/products?brand=${encodeURIComponent(b.canonical)}`}
                        className="hover:text-accent transition-colors"
                      >
                        {b.count}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editing ? (
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => commitRename(b)}
                            className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors disabled:opacity-60"
                          >
                            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                            Guardar
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={cancelEdit}
                            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-foreground"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(b)}
                            disabled={pending}
                            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-foreground disabled:opacity-50"
                          >
                            <Edit2 className="h-3 w-3" /> Renombrar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(b)}
                            disabled={pending}
                            className="inline-flex items-center gap-1 rounded-full border border-destructive/30 text-destructive px-3 py-1.5 text-xs font-medium hover:bg-destructive/5 disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" /> Quitar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">
        <strong>Renombrar</strong> hace búsqueda case-insensitive: si tenías
        &ldquo;Lady Joseph&rdquo; y &ldquo;lady joseph&rdquo; en distintos productos,
        ambas se unifican al nombre nuevo.
        {" "}
        <strong>Quitar</strong> deja los productos sin marca asignada; no borra
        los productos, solo pone <code>brand_override = null</code>.
      </p>
    </div>
  );
}
