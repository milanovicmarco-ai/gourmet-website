"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "../actions";

interface ProductCreateFormProps {
  families: string[];
}

export function ProductCreateForm({ families }: ProductCreateFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    ref: "",
    name: "",
    family: families[0] ?? "",
    short_description: "",
    base_price_eur: "",
    status: "draft" as "draft" | "published" | "archived",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const created = await createProduct({
        ref: form.ref.trim() || undefined,
        name: form.name.trim(),
        family: form.family || undefined,
        short_description: form.short_description.trim() || null,
        price_eur: form.base_price_eur === "" ? null : Number(form.base_price_eur),
        status: form.status,
      });
      router.push(`/admin/products/${encodeURIComponent(created.ref)}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-5">
        <Field
          label="Ref interna (opcional)"
          value={form.ref}
          onChange={(v) => set("ref", v)}
          placeholder="ej. 17999 — déjalo vacío para que se autogenere"
        />
        <SelectField
          label="Familia"
          value={form.family}
          onChange={(v) => set("family", v)}
          options={[
            { value: "", label: "— Selecciona —" },
            ...families.map((f) => ({ value: f, label: f })),
          ]}
        />
        <Field
          label="Nombre"
          value={form.name}
          onChange={(v) => set("name", v)}
          placeholder="ej. Manchego curado 12M"
          required
        />
        <Field
          label="Precio (€)"
          value={form.base_price_eur}
          onChange={(v) => set("base_price_eur", v)}
          type="number"
          step="0.01"
        />
      </div>

      <Textarea
        label="Descripción corta"
        value={form.short_description}
        onChange={(v) => set("short_description", v)}
        rows={3}
        max={220}
      />

      <SelectField
        label="Estado inicial"
        value={form.status}
        onChange={(v) => set("status", v as typeof form.status)}
        options={[
          { value: "draft", label: "Borrador" },
          { value: "published", label: "Publicado" },
          { value: "archived", label: "Archivado" },
        ]}
      />

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4 pt-2 border-t border-border">
        <button
          type="submit"
          disabled={saving || !form.name.trim()}
          className="bg-primary text-primary-foreground rounded-full px-7 py-3 font-medium hover:bg-accent transition-colors disabled:opacity-60"
        >
          {saving ? "Creando…" : "Crear y editar"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  step,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
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
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows = 3,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  max?: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
        <span>{label}</span>
        {max && (
          <span className={`text-[10px] tabular-nums ${value.length > max ? "text-destructive" : ""}`}>
            {value.length}/{max}
          </span>
        )}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        maxLength={max}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent leading-relaxed"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
