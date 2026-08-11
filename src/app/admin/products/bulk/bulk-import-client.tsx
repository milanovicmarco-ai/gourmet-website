"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { previewImport, applyImportChunk, type DiffSummary, type ApplyResult } from "./actions";

const CHUNK_SIZE = 25;

type State =
  | { kind: "idle" }
  | { kind: "previewing" }
  | { kind: "preview"; summary: DiffSummary }
  | { kind: "applying"; done: number; total: number }
  | { kind: "applied"; result: ApplyResult }
  | { kind: "error"; message: string };

export function BulkImportClient() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);

  async function onPreview() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setState({ kind: "error", message: "Selecciona un archivo .xlsx primero." });
      return;
    }
    fileRef.current = file;
    setState({ kind: "previewing" });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const summary = await previewImport(fd);
      setState({ kind: "preview", summary });
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  }

  async function onApply() {
    const file = fileRef.current;
    if (!file) {
      setState({ kind: "error", message: "Vuelve a seleccionar el archivo." });
      return;
    }
    if (!(state.kind === "preview")) return;
    const total = state.summary.rows.length;
    if (!confirm(`Aplicar ${total} filas al catálogo. ¿Continuar?`)) return;

    setState({ kind: "applying", done: 0, total });
    const accumulated: ApplyResult = { created: [], updated: [], deleted: [], errors: [], warnings: [] };

    try {
      for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
        const fd = new FormData();
        fd.append("file", file);
        const chunk = await applyImportChunk(fd, offset, CHUNK_SIZE);
        accumulated.created.push(...chunk.created);
        accumulated.updated.push(...chunk.updated);
        accumulated.deleted.push(...chunk.deleted);
        accumulated.errors.push(...chunk.errors);
        accumulated.warnings.push(...(chunk.warnings ?? []));
        setState({ kind: "applying", done: Math.min(offset + CHUNK_SIZE, total), total });
      }
      setState({ kind: "applied", result: accumulated });
      router.refresh();
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  }

  function reset() {
    setState({ kind: "idle" });
    fileRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-accent/10 file:cursor-pointer"
        />
        <button
          type="button"
          onClick={onPreview}
          disabled={state.kind === "previewing" || state.kind === "applying" || state.kind === "applied"}
          className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60"
        >
          {state.kind === "previewing" ? "Procesando…" : "Previsualizar"}
        </button>
        {state.kind !== "idle" && (
          <button
            type="button"
            onClick={reset}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Reset
          </button>
        )}
      </div>

      {state.kind === "error" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {state.message}
        </div>
      )}

      {state.kind === "preview" && (
        <div className="space-y-4 rounded-2xl border border-border bg-secondary/30 p-5">
          <h3 className="font-medium">Resumen del Excel subido</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Stat label="A crear" value={state.summary.toCreate} tone="emerald" />
            <Stat label="A modificar" value={state.summary.toUpdate} tone="sky" />
            <Stat label="A borrar" value={state.summary.toDelete} tone="amber" />
            <Stat label="Inválidas" value={state.summary.invalid} tone="rose" />
          </div>
          {state.summary.invalidReasons.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                Ver filas inválidas ({state.summary.invalidReasons.length})
              </summary>
              <ul className="mt-2 list-disc list-inside space-y-1 text-rose-700">
                {state.summary.invalidReasons.slice(0, 50).map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
                {state.summary.invalidReasons.length > 50 && (
                  <li className="text-muted-foreground">
                    … {state.summary.invalidReasons.length - 50} más
                  </li>
                )}
              </ul>
            </details>
          )}
          <div className="flex gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onApply}
              className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              Aplicar al catálogo
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-full px-6 py-2.5 text-sm font-medium border border-border hover:border-foreground transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {state.kind === "applying" && (
        <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
          <p className="text-sm">
            Aplicando… <span className="tabular-nums font-medium">{state.done} / {state.total}</span> filas
          </p>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${Math.round((state.done / Math.max(state.total, 1)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {state.kind === "applied" && (
        <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <h3 className="font-medium">Cambios aplicados</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <Stat label="Creados" value={state.result.created.length} tone="emerald" />
            <Stat label="Modificados" value={state.result.updated.length} tone="sky" />
            <Stat label="Borrados" value={state.result.deleted.length} tone="amber" />
            <Stat label="Avisos" value={state.result.warnings?.length ?? 0} tone="amber" />
            <Stat label="Errores" value={state.result.errors.length} tone="rose" />
          </div>
          {state.result.warnings && state.result.warnings.length > 0 && (
            <details className="text-sm" open>
              <summary className="cursor-pointer text-amber-700 font-medium">
                Ver avisos ({state.result.warnings.length}) — productos guardados como draft
              </summary>
              <ul className="mt-2 list-disc list-inside space-y-1 text-amber-700">
                {state.result.warnings.slice(0, 100).map((w, i) => (
                  <li key={i}>
                    Fila {w.line}{w.ref ? ` (${w.ref})` : ""}: {w.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {state.result.errors.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                Ver errores ({state.result.errors.length})
              </summary>
              <ul className="mt-2 list-disc list-inside space-y-1 text-rose-700">
                {state.result.errors.slice(0, 100).map((e, i) => (
                  <li key={i}>
                    Fila {e.line}{e.ref ? ` (${e.ref})` : ""}: {e.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "sky" | "amber" | "rose";
}) {
  const colors: Record<typeof tone, string> = {
    emerald: "text-emerald-600",
    sky: "text-sky-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
  };
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-display font-light text-3xl mt-1 tabular-nums ${colors[tone]}`}>
        {value}
      </p>
    </div>
  );
}
