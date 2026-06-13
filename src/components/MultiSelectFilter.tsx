"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type MultiOption = {
  value: string;
  label: string;
  /** Opcional, ej. contador "(45)" al lado del label. */
  hint?: string;
};

interface Props {
  label: string;
  /** Nombre del query param (los seleccionados se envían como CSV). */
  name: string;
  options: MultiOption[];
  /** Valores iniciales (los que vienen de la URL). */
  defaultValues: string[];
}

/** Dropdown popover con checkboxes. Envía los seleccionados como CSV vía un
 *  hidden input dentro del form, así el server los recibe en una sola key. */
export function MultiSelectFilter({ label, name, options, defaultValues }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultValues));
  const rootRef = useRef<HTMLDivElement>(null);

  // Cerrar al click fuera o ESC
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(value: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    setSelected(new Set());
  }

  const count = selected.size;
  const csv = Array.from(selected).join(",");

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={csv} />
      <label className="block space-y-1.5">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "w-full bg-background border border-border rounded-full px-4 py-3 text-sm text-left flex items-center justify-between gap-2",
            "focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition",
            count > 0 && "border-accent/60",
          )}
        >
          <span className={cn("truncate", count === 0 && "text-muted-foreground")}>
            {count === 0
              ? "Todos"
              : count === 1
                ? options.find((o) => selected.has(o.value))?.label ?? `${count} seleccionado`
                : `${count} seleccionados`}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {count > 0 && (
              <span
                role="button"
                tabIndex={-1}
                onClick={clear}
                aria-label="Limpiar selección"
                className="rounded-full p-0.5 hover:bg-secondary cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </span>
        </button>
      </label>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-border bg-background shadow-lg p-1">
          {options.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Sin opciones</p>
          ) : (
            options.map((o) => {
              const active = selected.has(o.value);
              return (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => toggle(o.value)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm text-left",
                    active ? "bg-accent/10 text-foreground" : "hover:bg-secondary",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-4 w-4 rounded border grid place-items-center shrink-0",
                        active ? "bg-accent border-accent text-accent-foreground" : "border-border",
                      )}
                    >
                      {active && <Check className="h-3 w-3" />}
                    </span>
                    <span>{o.label}</span>
                  </span>
                  {o.hint && (
                    <span className="text-xs text-muted-foreground tabular-nums">{o.hint}</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
