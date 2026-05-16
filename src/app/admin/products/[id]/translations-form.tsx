"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Save } from "lucide-react";
import { saveTranslation, translateFields, type TranslatableFields } from "./translations-actions";
import type { ApiProduct } from "@/lib/pim/api";
import type { Locale } from "@/lib/pim/translations";

interface Props {
  productRef: string;
  locale: Locale;
  /** Lo que se está mostrando hoy en ese idioma (puede estar vacío). */
  initial: TranslatableFields;
  /** Campos originales en español para el botón "Traducir con IA". */
  source: ApiProduct;
}

export function TranslationsForm({ productRef, locale, initial, source }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<TranslatableFields>({
    name: initial.name ?? "",
    descripcion_corta: initial.descripcion_corta ?? "",
    description_rich: initial.description_rich ?? "",
    flavor: initial.flavor ?? "",
    origen: initial.origen ?? "",
    ingredientes: initial.ingredientes ?? "",
    seo_title: initial.seo_title ?? "",
    seo_description: initial.seo_description ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function set<K extends keyof TranslatableFields>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await saveTranslation(productRef, locale, form);
      setMsg({ kind: "ok", text: "Traducción guardada" });
      router.refresh();
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function autoTranslate() {
    setTranslating(true);
    setMsg(null);
    try {
      const translated = await translateFields(
        {
          name: source.name,
          descripcion_corta: source.descripcion_corta ?? "",
          description_rich: source.description_rich ?? "",
          flavor: source.flavor ?? "",
          origen: source.origen ?? "",
          ingredientes: source.ingredientes ?? "",
          seo_title: source.seo_title ?? "",
          seo_description: source.seo_description ?? "",
        },
        locale,
      );
      setForm((f) => ({
        ...f,
        ...Object.fromEntries(
          Object.entries(translated).map(([k, v]) => [k, v ?? ""]),
        ),
      }));
      setMsg({ kind: "ok", text: "Traducido desde español. Revisa y guarda." });
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message });
    } finally {
      setTranslating(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-4">
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-medium">
            Editando en <span className="text-accent uppercase tracking-wider">{locale}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Los campos vacíos hacen fallback al español. No traduzcas lo que sea idéntico (ej. nombres propios).
          </p>
        </div>
        <button
          type="button"
          onClick={autoTranslate}
          disabled={translating || saving}
          className="inline-flex items-center gap-2 text-sm bg-accent text-accent-foreground rounded-full px-4 py-2 font-medium hover:opacity-90 transition disabled:opacity-60"
        >
          {translating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Traducir desde español
        </button>
      </div>

      <Field label="Nombre" value={form.name ?? ""} onChange={(v) => set("name", v)} placeholder={source.name} />
      <Textarea
        label="Descripción corta"
        value={form.descripcion_corta ?? ""}
        onChange={(v) => set("descripcion_corta", v)}
        rows={3}
        max={220}
        placeholder={source.descripcion_corta ?? ""}
      />
      <div className="space-y-1.5">
        <Textarea
          label="Descripción larga (Markdown)"
          value={form.description_rich ?? ""}
          onChange={(v) => set("description_rich", v)}
          rows={8}
          placeholder={source.description_rich ?? ""}
        />
        <p className="text-[11px] text-muted-foreground">
          Acepta Markdown · doble enter para párrafo · <code>**negrita**</code> · <code>*cursiva*</code> · <code>- lista</code>
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Sabor" value={form.flavor ?? ""} onChange={(v) => set("flavor", v)} placeholder={source.flavor ?? ""} />
        <Field label="Origen" value={form.origen ?? ""} onChange={(v) => set("origen", v)} placeholder={source.origen ?? ""} />
      </div>
      <Textarea
        label="Ingredientes"
        value={form.ingredientes ?? ""}
        onChange={(v) => set("ingredientes", v)}
        rows={3}
        placeholder={source.ingredientes ?? ""}
      />

      <fieldset className="rounded-2xl border border-border p-5 space-y-4">
        <legend className="px-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">SEO</legend>
        <Field
          label="Title (≤ 60)"
          value={form.seo_title ?? ""}
          onChange={(v) => set("seo_title", v)}
          max={60}
          placeholder={source.seo_title ?? ""}
        />
        <Textarea
          label="Description (≤ 160)"
          value={form.seo_description ?? ""}
          onChange={(v) => set("seo_description", v)}
          rows={2}
          max={160}
          placeholder={source.seo_description ?? ""}
        />
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-7 py-3 font-medium hover:bg-accent transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Guardando…" : "Guardar traducción"}
        </button>
        {msg && (
          <p className={`text-sm ${msg.kind === "ok" ? "text-emerald-600" : "text-destructive"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  max?: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type="text"
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  max?: number;
  placeholder?: string;
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
        placeholder={placeholder}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent leading-relaxed"
      />
    </label>
  );
}
