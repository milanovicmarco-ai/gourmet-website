"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Plus, X } from "lucide-react";
import { createBrand, createFamily } from "../actions";

export type EntityOption = {
  slug: string;
  name: string;
};

interface EntityComboboxProps {
  kind: "brand" | "family";
  value: string | null;
  options: EntityOption[];
  onChange: (slug: string | null) => void;
  onOptionsChange?: (next: EntityOption[]) => void;
  placeholder?: string;
  /** Texto a mostrar cuando value es null pero hay un valor guardado que no
   *  está en las opciones (ej. marca en brand_override no registrada en la API). */
  fallbackLabel?: string;
}

/**
 * Combobox con autocompletar + opción explícita de "crear nueva entidad".
 *
 * UX:
 *  - Click → despliega lista filtrable
 *  - Escribiendo se filtra (match en name o slug, case-insensitive)
 *  - Si la búsqueda coincide EXACTAMENTE con un name existente, NO ofrece crear
 *  - Si la búsqueda NO coincide con ninguna → al final aparece "+ Crear: 'X'"
 *  - Pulsar crear → llama al server action, añade la opción local, queda seleccionada
 *  - Botón ✕ para limpiar el valor
 */
export function EntityCombobox({
  kind,
  value,
  options,
  onChange,
  onOptionsChange,
  placeholder,
  fallbackLabel,
}: EntityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.slug === value) ?? null;
  const displayLabel = selected?.name ?? (fallbackLabel?.trim() || null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        setError(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q),
    );
  }, [query, options]);

  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return (
      options.find(
        (o) => o.name.toLowerCase() === q || o.slug.toLowerCase() === q,
      ) ?? null
    );
  }, [query, options]);

  const canCreate = query.trim().length > 0 && !exactMatch && !creating;

  async function handleCreate() {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      let createdSlug: string;
      let createdName: string;
      if (kind === "brand") {
        const created = await createBrand(name);
        createdSlug = created.slug;
        createdName = created.name;
      } else {
        // Family: slug = MAYÚSCULAS_CON_GUIONES_BAJOS
        const slug = name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
        const created = await createFamily(slug, name);
        createdSlug = created.slug;
        createdName = created.name;
      }
      const next = [...options, { slug: createdSlug, name: createdName }].sort(
        (a, b) => a.name.localeCompare(b.name),
      );
      onOptionsChange?.(next);
      onChange(createdSlug);
      setOpen(false);
      setQuery("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
        >
          <span className={displayLabel ? (selected ? "" : "text-amber-600") : "text-muted-foreground"}>
            {displayLabel ?? placeholder ?? "— Seleccionar —"}
          </span>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
        {selected && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="px-2 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Limpiar selección"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-background border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="border-b border-border p-2">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setError(null);
              }}
              placeholder={`Buscar ${kind === "brand" ? "marca" : "familia"}…`}
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <ul className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && !canCreate && (
              <li className="px-3 py-4 text-sm text-muted-foreground text-center">
                Sin resultados
              </li>
            )}
            {filtered.map((o) => {
              const active = o.slug === value;
              return (
                <li key={o.slug}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.slug);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-secondary transition-colors ${
                      active ? "bg-secondary/50" : ""
                    }`}
                  >
                    <div className="flex flex-col">
                      <span>{o.name}</span>
                      {o.name !== o.slug && (
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {o.slug}
                        </span>
                      )}
                    </div>
                    {active && <Check className="h-4 w-4 text-accent shrink-0" />}
                  </button>
                </li>
              );
            })}
            {canCreate && (
              <li className="border-t border-border bg-secondary/30">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-accent/10 transition-colors disabled:opacity-60"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 text-accent" />
                  )}
                  <span>
                    Crear {kind === "brand" ? "marca" : "familia"}:{" "}
                    <strong>&quot;{query.trim()}&quot;</strong>
                  </span>
                </button>
              </li>
            )}
          </ul>

          {error && (
            <p className="border-t border-destructive/30 bg-destructive/10 text-destructive text-xs px-3 py-2">
              {error}
            </p>
          )}

          <p className="border-t border-border bg-secondary/30 text-[11px] text-muted-foreground px-3 py-1.5">
            Antes de crear, asegúrate de que la {kind === "brand" ? "marca" : "familia"} no existe ya con otro nombre.
          </p>
        </div>
      )}
    </div>
  );
}
