"use client";

import { useState } from "react";
import { Sparkles, Check, X, Loader2, RefreshCw } from "lucide-react";
import { suggestFieldFromContext } from "../ai-actions";
import type { AIField } from "../ai-actions";

interface AIAssistButtonProps {
  field: AIField;
  /** Función que devuelve TODO el contexto del producto en este momento (lo que hay en el form). */
  getContext: () => Record<string, string | string[] | null | undefined>;
  /** Callback para aplicar la sugerencia al campo. */
  onAccept: (suggestion: string) => void;
  /** Etiqueta corta para el tooltip ej. "Sugerir descripción". */
  label?: string;
}

export function AIAssistButton({ field, getContext, onAccept, label }: AIAssistButtonProps) {
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const result = await suggestFieldFromContext(field, getContext());
      setSuggestion(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function accept() {
    if (suggestion) {
      onAccept(suggestion);
      setSuggestion(null);
    }
  }

  function dismiss() {
    setSuggestion(null);
    setError(null);
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={generate}
        disabled={busy}
        title={label ?? "Sugerir con IA"}
        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-accent/30 text-accent bg-accent/5 hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Sparkles className="h-3 w-3" />
        )}
        IA
      </button>

      {(suggestion || error) && (
        <div className="absolute z-30 top-full mt-2 right-0 w-[min(420px,80vw)] rounded-2xl border border-accent/40 bg-background shadow-lg p-4 space-y-3">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-accent" /> Sugerencia
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-line">{suggestion}</p>
            </>
          )}
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            {suggestion && !error && (
              <>
                <button
                  type="button"
                  onClick={accept}
                  className="inline-flex items-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-full px-3 py-1.5 font-medium hover:bg-accent transition-colors"
                >
                  <Check className="h-3 w-3" /> Aplicar
                </button>
                <button
                  type="button"
                  onClick={generate}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 text-xs border border-border rounded-full px-3 py-1.5 hover:border-foreground transition-colors disabled:opacity-60"
                >
                  <RefreshCw className="h-3 w-3" /> Reintentar
                </button>
              </>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
            >
              <X className="h-3 w-3" /> Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
