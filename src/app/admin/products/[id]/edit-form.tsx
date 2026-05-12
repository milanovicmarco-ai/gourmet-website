"use client";

import { FormEvent, ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProduct } from "../actions";
import type { FormFields } from "@/lib/pim/api-mapper";
import { AIAssistButton } from "./ai-assist-button";
import type { AIField } from "../ai-actions";
import { EntityCombobox, type EntityOption } from "./entity-combobox";

interface ProductEditFormProps {
  productRef: string;
  initial: FormFields;
  brandOptions: EntityOption[];
  familyOptions: EntityOption[];
  hasImage: boolean;
}

export function ProductEditForm({ productRef, initial, brandOptions: initialBrands, familyOptions: initialFamilies, hasImage }: ProductEditFormProps) {
  const router = useRouter();
  const [brandOptions, setBrandOptions] = useState(initialBrands);
  const [familyOptions, setFamilyOptions] = useState(initialFamilies);
  const [form, setForm] = useState({
    name: initial.name ?? "",
    family: initial.family ?? "",
    brand: initial.brand ?? "",
    short_description: initial.short_description ?? "",
    long_description: initial.long_description ?? "",
    origin: initial.origin ?? "",
    flavor: initial.flavor ?? "",
    format: initial.format ?? "",
    price_eur: initial.price_eur != null ? String(initial.price_eur) : "",
    status: (initial.status as "draft" | "published" | "archived") ?? "published",
    seo_title: initial.seo_title ?? "",
    seo_description: initial.seo_description ?? "",
    badges: Array.isArray(initial.badges) ? initial.badges.join(", ") : (initial.badges ?? ""),
    pairings: Array.isArray(initial.pairings) ? initial.pairings.join(", ") : (initial.pairings ?? ""),
    allergens: Array.isArray(initial.allergens) ? initial.allergens.join(", ") : (initial.allergens ?? ""),
    ingredients: initial.ingredients ?? "",
    gluten_free: !!initial.gluten_free,
    lactose_free: !!initial.lactose_free,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "warn" | "err"; text: string } | null>(null);

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  /** Snapshot del form en español plano para que la IA tenga contexto. */
  const aiContext = () => ({
    name: form.name,
    brand: form.brand,
    family: form.family,
    origen: form.origin,
    flavor: form.flavor,
    formato: form.format,
    ingredientes: form.ingredients,
    alergenos: form.allergens,
    tags: form.badges,
    pairings: form.pairings,
    descripcion_corta: form.short_description,
    description_rich: form.long_description,
  });

  function aiButton(field: AIField, label: string, target: keyof typeof form) {
    return (
      <AIAssistButton
        field={field}
        getContext={aiContext}
        label={label}
        onAccept={(s) => set(target, s as never)}
      />
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    // Bloqueo cliente: si pretende publicar y faltan obligatorios, no enviamos.
    if (form.status === "published" && missingRequired.length > 0) {
      setMessage({
        kind: "err",
        text: `No puedes publicar todavía. Faltan: ${missingRequired.join(", ")}.`,
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const data = await updateProduct(productRef, {
        ...form,
        price_eur: form.price_eur === "" ? null : Number(form.price_eur),
      });
      const score = data.optimization_score ?? "?";
      setMessage({
        kind: missingRequired.length > 0 ? "warn" : "ok",
        text:
          missingRequired.length > 0
            ? `Guardado · score ${score}/100. Para publicar te faltan: ${missingRequired.join(", ")}`
            : `Guardado · score ${score}/100`,
      });
      router.refresh();
    } catch (e) {
      setMessage({ kind: "err", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  // Campos obligatorios para PUBLICAR. Faltarlos no bloquea guardar en draft,
  // pero sí bloquea cambiar status a "published".
  const allergensStr = typeof form.allergens === "string"
    ? form.allergens
    : Array.isArray(form.allergens) ? form.allergens.join(",") : "";
  const missingRequired: string[] = [];
  if (!form.name?.trim()) missingRequired.push("nombre");
  if (!form.brand) missingRequired.push("marca");
  if (!form.family) missingRequired.push("familia");
  if (!form.short_description?.trim()) missingRequired.push("descripción corta");
  if (!form.long_description?.trim()) missingRequired.push("descripción larga");
  if (!hasImage) missingRequired.push("imagen");
  if (!allergensStr.trim()) missingRequired.push("alérgenos (escribe 'ninguno' si no aplica)");
  const canPublish = missingRequired.length === 0;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {missingRequired.length > 0 ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <span aria-hidden className="text-amber-600 text-lg leading-none mt-0.5">⚠️</span>
          <div className="text-sm flex-1">
            <p className="font-medium text-amber-900">
              Faltan {missingRequired.length} {missingRequired.length === 1 ? "campo obligatorio" : "campos obligatorios"} para publicar
            </p>
            <p className="text-amber-800 mt-0.5">
              {missingRequired.join(" · ")}
            </p>
            <p className="text-xs text-amber-700/80 mt-1">
              Puedes guardarlo en borrador, pero no podrás cambiarlo a &quot;Publicado&quot; hasta completarlos.
            </p>
          </div>
        </div>
      ) : (
        form.status !== "published" && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 flex items-start gap-3">
            <span aria-hidden className="text-emerald-600 text-lg leading-none mt-0.5">✓</span>
            <div className="text-sm flex-1">
              <p className="font-medium text-emerald-900">Listo para publicar</p>
              <p className="text-emerald-800/80 text-xs mt-0.5">
                Cambia el estado a &quot;Publicado&quot; cuando quieras que aparezca en el escaparate.
              </p>
            </div>
          </div>
        )
      )}
      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Nombre" value={form.name} onChange={(v) => set("name", v)} />
        <ComboField label="Marca">
          <EntityCombobox
            kind="brand"
            value={form.brand || null}
            options={brandOptions}
            onChange={(slug) => set("brand", slug ?? "")}
            onOptionsChange={setBrandOptions}
            placeholder="— Elegir marca —"
          />
        </ComboField>
        <ComboField label="Familia">
          <EntityCombobox
            kind="family"
            value={form.family || null}
            options={familyOptions}
            onChange={(slug) => set("family", slug ?? "")}
            onOptionsChange={setFamilyOptions}
            placeholder="— Elegir familia —"
          />
        </ComboField>
        <Field label="Origen" value={form.origin} onChange={(v) => set("origin", v)} />
        <Field label="Formato" value={form.format} onChange={(v) => set("format", v)} placeholder="ej. 250 g · cuña" />
        <Field
          label="Precio (€)"
          value={form.price_eur}
          onChange={(v) => set("price_eur", v)}
          type="number"
          step="0.01"
        />
      </div>

      <Textarea
        label="Sabor"
        value={form.flavor}
        onChange={(v) => set("flavor", v)}
        rows={2}
        action={aiButton("flavor", "Sugerir sabor", "flavor")}
      />
      <Textarea
        label="Descripción corta (≤ 220 caracteres)"
        value={form.short_description}
        onChange={(v) => set("short_description", v)}
        rows={3}
        max={220}
        action={aiButton("short_description", "Sugerir descripción corta", "short_description")}
      />
      <Textarea
        label="Descripción larga"
        value={form.long_description}
        onChange={(v) => set("long_description", v)}
        rows={6}
        action={aiButton("long_description", "Sugerir descripción larga", "long_description")}
      />
      <Textarea
        label="Ingredientes"
        value={form.ingredients}
        onChange={(v) => set("ingredients", v)}
        rows={3}
      />

      <div className="grid sm:grid-cols-3 gap-5">
        <Field
          label="Tags / badges (coma)"
          value={form.badges}
          onChange={(v) => set("badges", v)}
          placeholder="DOP, Premium"
          action={aiButton("tags", "Sugerir tags", "badges")}
        />
        <Field
          label="Maridajes (coma)"
          value={form.pairings}
          onChange={(v) => set("pairings", v)}
          placeholder="Membrillo, Vino tinto"
          action={aiButton("pairings", "Sugerir maridajes", "pairings")}
        />
        <Field label="Alérgenos (coma)" value={form.allergens} onChange={(v) => set("allergens", v)} placeholder="lactosa, frutos secos" />
      </div>

      <fieldset className="rounded-2xl border border-border p-5 grid sm:grid-cols-2 gap-3">
        <legend className="px-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Atributos dietéticos</legend>
        <Toggle label="Sin gluten" checked={form.gluten_free} onChange={(v) => set("gluten_free", v)} />
        <Toggle label="Sin lactosa" checked={form.lactose_free} onChange={(v) => set("lactose_free", v)} />
      </fieldset>

      <fieldset className="rounded-2xl border border-border p-5 space-y-4">
        <legend className="px-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">SEO</legend>
        <Field
          label="Title (≤ 60)"
          value={form.seo_title}
          onChange={(v) => set("seo_title", v)}
          max={60}
          action={aiButton("seo_title", "Sugerir title SEO", "seo_title")}
        />
        <Textarea
          label="Description (≤ 160)"
          value={form.seo_description}
          onChange={(v) => set("seo_description", v)}
          rows={2}
          max={160}
          action={aiButton("seo_description", "Sugerir description SEO", "seo_description")}
        />
      </fieldset>

      <fieldset className="rounded-2xl border border-border p-5 space-y-3">
        <legend className="px-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Estado de publicación
        </legend>
        <SelectField
          label={canPublish ? "Estado" : "Estado (publicar bloqueado)"}
          value={form.status}
          onChange={(v) => set("status", v as typeof form.status)}
          options={[
            { value: "draft", label: "Borrador" },
            {
              value: "published",
              label: canPublish ? "Publicado" : "Publicado (faltan obligatorios)",
              disabled: !canPublish && form.status !== "published",
            },
            { value: "archived", label: "Archivado" },
          ]}
        />
        {!canPublish && (
          <p className="text-xs text-amber-700">
            Completa los campos obligatorios del banner de arriba para desbloquear &quot;Publicado&quot;.
          </p>
        )}
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
            className={`text-sm ${
              message.kind === "ok"
                ? "text-emerald-600"
                : message.kind === "warn"
                  ? "text-amber-700"
                  : "text-destructive"
            }`}
          >
            {message.kind === "warn" && "⚠️ "}
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}

function ComboField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  step,
  placeholder,
  max,
  action,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
  max?: number;
  action?: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between gap-2">
        <span>{label}</span>
        {action}
      </span>
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
  action,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  max?: number;
  action?: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span>{label}</span>
          {max && (
            <span className={`text-[10px] tabular-nums ${value.length > max ? "text-destructive" : ""}`}>
              {value.length}/{max}
            </span>
          )}
        </span>
        {action}
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
  options: { value: string; label: string; disabled?: boolean }[];
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
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-accent"
      />
      <span>{label}</span>
    </label>
  );
}
