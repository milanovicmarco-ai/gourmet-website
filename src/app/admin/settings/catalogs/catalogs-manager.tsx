"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, Save, X, Eye, EyeOff } from "lucide-react";
import { createCatalog, updateCatalog, deleteCatalog } from "../actions";
import type { Catalog } from "@/lib/pim/catalogs";

interface Props {
  initial: Catalog[];
}

export function CatalogsManager({ initial }: Props) {
  const router = useRouter();
  const [catalogs, setCatalogs] = useState<Catalog[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(form: FormData) {
    setBusy(true);
    setError(null);
    try {
      const created = await createCatalog({
        name: String(form.get("name") || "").trim(),
        slug: String(form.get("slug") || "").trim() || undefined,
        description: String(form.get("description") || "").trim(),
        color: String(form.get("color") || "#fa2ca2"),
        sort_order: Number(form.get("sort_order") || 0),
      });
      setCatalogs((prev) => [...prev, created as Catalog].sort((a, b) => a.sort_order - b.sort_order));
      setCreating(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(c: Catalog, patch: Partial<Catalog>) {
    setBusy(true);
    setError(null);
    try {
      await updateCatalog(c.id, patch);
      setCatalogs((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, ...patch } as Catalog : x)),
      );
      setEditingId(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(c: Catalog) {
    if (!confirm(`¿Borrar el catálogo "${c.name}"? Las asignaciones de productos a este catálogo se perderán.`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteCatalog(c.id);
      setCatalogs((prev) => prev.filter((x) => x.id !== c.id));
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Listado */}
      <ul className="space-y-2">
        {catalogs.map((c) => (
          <li
            key={c.id}
            className={`rounded-2xl border border-border bg-background p-4 ${!c.active ? "opacity-60" : ""}`}
          >
            {editingId === c.id ? (
              <form
                onSubmit={(e: FormEvent<HTMLFormElement>) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  handleUpdate(c, {
                    name: String(fd.get("name") || "").trim(),
                    slug: String(fd.get("slug") || "").trim(),
                    description: String(fd.get("description") || "").trim() || null,
                    color: String(fd.get("color") || c.color),
                    sort_order: Number(fd.get("sort_order") || 0),
                  });
                }}
                className="space-y-3"
              >
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input label="Nombre" name="name" defaultValue={c.name} required />
                  <Input label="Slug (URL)" name="slug" defaultValue={c.slug} />
                </div>
                <Textarea label="Descripción" name="description" defaultValue={c.description ?? ""} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Color</span>
                    <input
                      type="color"
                      name="color"
                      defaultValue={c.color ?? "#fa2ca2"}
                      className="w-20 h-10 rounded-lg border border-border"
                    />
                  </label>
                  <Input label="Orden" name="sort_order" type="number" defaultValue={String(c.sort_order)} />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" /> Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="inline-flex items-center gap-2 border border-border rounded-full px-5 py-2 text-sm font-medium hover:border-foreground transition-colors"
                  >
                    <X className="h-4 w-4" /> Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="h-10 w-10 rounded-full shrink-0 ring-1 ring-border"
                    style={{ background: c.color ?? "#fa2ca2" }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      <code>/{c.slug}</code>
                      {c.description && <> · {c.description}</>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleUpdate(c, { active: !c.active })}
                    title={c.active ? "Archivar" : "Reactivar"}
                    className="h-9 w-9 rounded-full hover:bg-secondary grid place-items-center text-muted-foreground"
                  >
                    {c.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(c.id)}
                    title="Editar"
                    className="h-9 w-9 rounded-full hover:bg-secondary grid place-items-center"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c)}
                    title="Borrar"
                    className="h-9 w-9 rounded-full hover:bg-destructive/10 grid place-items-center text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Crear nuevo */}
      {creating ? (
        <form
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            handleCreate(new FormData(e.currentTarget));
          }}
          className="rounded-2xl border-2 border-dashed border-accent/40 bg-accent/5 p-5 space-y-3"
        >
          <h3 className="font-display font-medium">Nuevo catálogo</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Nombre" name="name" placeholder="ej. Premium Selection" required />
            <Input label="Slug (auto si vacío)" name="slug" placeholder="premium-selection" />
          </div>
          <Textarea label="Descripción" name="description" placeholder="Para qué tipo de cliente o sección" />
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Color</span>
              <input
                type="color"
                name="color"
                defaultValue="#fa2ca2"
                className="w-20 h-10 rounded-lg border border-border"
              />
            </label>
            <Input label="Orden" name="sort_order" type="number" defaultValue="0" />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> Crear
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="inline-flex items-center gap-2 border border-border rounded-full px-5 py-2 text-sm font-medium hover:border-foreground transition-colors"
            >
              <X className="h-4 w-4" /> Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-secondary/30 hover:border-accent hover:bg-secondary/60 px-5 py-4 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> Añadir catálogo
        </button>
      )}
    </div>
  );
}

function Input({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="text-accent ml-1">*</span>}
      </span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={2}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent leading-relaxed"
      />
    </label>
  );
}
