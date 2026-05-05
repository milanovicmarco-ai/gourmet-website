"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { computeOptimizationScore } from "@/lib/pim/score";

type Product = Record<string, unknown> & {
  id: string;
  slug: string;
  name: string;
  ref: string | null;
  short_description: string | null;
  long_description: string | null;
  origin: string | null;
  flavor: string | null;
  format: string | null;
  price_eur: number | null;
  status: string;
  seo_title: string | null;
  seo_description: string | null;
  badges: string[] | null;
  pairings: string[] | null;
  allergens: string[] | null;
};

export function ProductEditForm({ product }: { product: Product }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: product.name ?? "",
    ref: product.ref ?? "",
    short_description: product.short_description ?? "",
    long_description: product.long_description ?? "",
    origin: product.origin ?? "",
    flavor: product.flavor ?? "",
    format: product.format ?? "",
    price_eur: product.price_eur != null ? String(product.price_eur) : "",
    status: product.status ?? "draft",
    seo_title: product.seo_title ?? "",
    seo_description: product.seo_description ?? "",
    badges: (product.badges ?? []).join(", "),
    pairings: (product.pairings ?? []).join(", "),
    allergens: (product.allergens ?? []).join(", "),
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      name: form.name.trim(),
      ref: form.ref.trim() || null,
      short_description: form.short_description.trim() || null,
      long_description: form.long_description.trim() || null,
      origin: form.origin.trim() || null,
      flavor: form.flavor.trim() || null,
      format: form.format.trim() || null,
      price_eur: form.price_eur ? Number(form.price_eur) : null,
      status: form.status,
      seo_title: form.seo_title.trim() || null,
      seo_description: form.seo_description.trim() || null,
      badges: csvToArray(form.badges),
      pairings: csvToArray(form.pairings),
      allergens: csvToArray(form.allergens),
    };

    const score = computeOptimizationScore({ ...product, ...payload } as never);

    const { error } = await supabase
      .from("products")
      .update({ ...payload, optimization_score: score.total })
      .eq("id", product.id);

    setSaving(false);
    if (error) {
      setMessage({ kind: "err", text: error.message });
      return;
    }
    setMessage({ kind: "ok", text: `Guardado · score ${score.total}/100` });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Nombre" value={form.name} onChange={(v) => set("name", v)} />
        <Field label="Referencia" value={form.ref} onChange={(v) => set("ref", v)} />
        <Field label="Origen" value={form.origin} onChange={(v) => set("origin", v)} />
        <Field label="Formato" value={form.format} onChange={(v) => set("format", v)} />
        <Field
          label="Precio (€)"
          value={form.price_eur}
          onChange={(v) => set("price_eur", v)}
          type="number"
          step="0.01"
        />
        <SelectField
          label="Estado"
          value={form.status}
          onChange={(v) => set("status", v)}
          options={[
            { value: "draft", label: "Borrador" },
            { value: "published", label: "Publicado" },
            { value: "archived", label: "Archivado" },
          ]}
        />
      </div>

      <Textarea
        label="Sabor"
        value={form.flavor}
        onChange={(v) => set("flavor", v)}
        rows={2}
      />

      <Textarea
        label="Descripción corta (≤ 220 caracteres)"
        value={form.short_description}
        onChange={(v) => set("short_description", v)}
        rows={3}
        max={220}
      />

      <Textarea
        label="Descripción larga"
        value={form.long_description}
        onChange={(v) => set("long_description", v)}
        rows={6}
      />

      <div className="grid sm:grid-cols-3 gap-5">
        <Field
          label="Badges (coma)"
          value={form.badges}
          onChange={(v) => set("badges", v)}
          placeholder="DOP, Premium"
        />
        <Field
          label="Maridajes (coma)"
          value={form.pairings}
          onChange={(v) => set("pairings", v)}
          placeholder="Membrillo, Vino tinto"
        />
        <Field
          label="Alérgenos (coma)"
          value={form.allergens}
          onChange={(v) => set("allergens", v)}
          placeholder="lactosa, frutos secos"
        />
      </div>

      <fieldset className="rounded-2xl border border-border p-5 space-y-4">
        <legend className="px-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">SEO</legend>
        <Field
          label="Title (≤ 60)"
          value={form.seo_title}
          onChange={(v) => set("seo_title", v)}
          max={60}
        />
        <Textarea
          label="Description (≤ 160)"
          value={form.seo_description}
          onChange={(v) => set("seo_description", v)}
          rows={2}
          max={160}
        />
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border">
        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-primary-foreground rounded-full px-7 py-3 font-medium hover:bg-accent transition-colors disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
        {message && (
          <p
            className={`text-sm ${message.kind === "ok" ? "text-emerald-600" : "text-destructive"}`}
          >
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}

function csvToArray(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  step,
  placeholder,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
  max?: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={max}
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
