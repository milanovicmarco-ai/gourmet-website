"use client";

import { FormEvent, ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProduct } from "../actions";
import { saveProductMeta } from "./meta-actions";
import type { FormFields } from "@/lib/pim/api-mapper";
import type { ProductMeta } from "@/lib/pim/product-meta";
import { AIAssistButton } from "./ai-assist-button";
import type { AIField } from "../ai-actions";
import { computeOptimizationScore } from "@/lib/pim/score";

interface ProductEditFormProps {
  productRef: string;
  initial: FormFields;
  meta: ProductMeta;
  /** Familias disponibles para autocomplete (combinación API + overlay settings). */
  families?: { slug: string; display_name: string; active: boolean; count: number }[];
}

export function ProductEditForm({ productRef, initial, meta, families = [] }: ProductEditFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    // La ref del form es la "ref visible al usuario": display_ref si existe, si no la canónica de la API.
    // Al guardar, se almacena en product_meta.display_ref (la API trata su ref como inmutable).
    ref: meta.display_ref?.trim() || initial.ref || productRef,
    name: initial.name ?? "",
    family: initial.family ?? "",
    // Brand SE EDITA en el PIM pero NO viaja a la API del socio; va a product_meta.
    brand: meta.brand_override ?? (initial.brand ?? ""),
    short_description: initial.short_description ?? "",
    long_description: initial.long_description ?? "",
    origin: initial.origin ?? "",
    flavor: initial.flavor ?? "",
    format: initial.format ?? "",
    units_per_box: initial.units_per_box != null ? String(initial.units_per_box) : "",
    price_eur: initial.price_eur != null ? String(initial.price_eur) : "",
    status: (initial.status as "draft" | "published" | "archived") ?? "published",
    seo_title: initial.seo_title ?? "",
    seo_description: initial.seo_description ?? "",
    badges: Array.isArray(initial.badges) ? initial.badges.join(", ") : (initial.badges ?? ""),
    pairings: Array.isArray(initial.pairings) ? initial.pairings.join(", ") : (initial.pairings ?? ""),
    ingredients: initial.ingredients ?? "",
    info_nutricional: initial.info_nutricional ?? "",
    // 3 dietéticos que vienen de la API
    gluten_free: !!initial.gluten_free,
    lactose_free: !!initial.lactose_free,
    vegetarian: false, // se cargará abajo si lo tenemos en initial (extender si quieres)
    // 5 dietéticos extras del overlay nuestro
    diet_no_nuts: meta.diet_no_nuts,
    diet_vegan: meta.diet_vegan,
    diet_no_added_sugar: meta.diet_no_added_sugar,
    diet_high_protein: meta.diet_high_protein,
    diet_keto: meta.diet_keto,
    diet_other: meta.diet_other ?? "",
    // Clasificación gastronómica (overlay)
    gama: meta.gama != null ? String(meta.gama) : "",
    momento_plato: meta.momento_plato ?? "",
    destacado: !!meta.destacado,
    // Catálogos donde está destacado (multi-select: horeca, retail, fromages).
    destacado_horeca: Array.isArray(meta.destacado_en) ? meta.destacado_en.includes("horeca") : false,
    destacado_retail: Array.isArray(meta.destacado_en) ? meta.destacado_en.includes("retail") : false,
    destacado_fromages: Array.isArray(meta.destacado_en) ? meta.destacado_en.includes("fromages") : false,
    primer_precio: !!meta.primer_precio,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

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
    setSaving(true);
    setMessage(null);

    try {
      // 1) Producto a la API del socio. Si publica y no cumple requisitos del
      // backend (marca, etc.), updateProduct hará fallback automático a "draft"
      // — el PIM nunca rechaza un guardado.
      const result = await updateProduct(productRef, {
        ...form,
        price_eur: form.price_eur === "" ? null : Number(form.price_eur),
        units_per_box: form.units_per_box === "" ? null : Number(form.units_per_box),
      });
      const data = result.product as {
        image_url?: string | null;
        gallery?: string[];
        info_nutricional?: unknown;
      };

      // 2) Overlay (brand + diet extras + display_ref + clasificación) a Supabase.
      const destacadoEn = [
        form.destacado_horeca && "horeca",
        form.destacado_retail && "retail",
        form.destacado_fromages && "fromages",
      ].filter((s): s is string => Boolean(s));
      const metaResult = await saveProductMeta({
        product_ref: productRef,
        display_ref: form.ref,
        brand_override: form.brand,
        diet_no_nuts: form.diet_no_nuts,
        diet_vegan: form.diet_vegan,
        diet_no_added_sugar: form.diet_no_added_sugar,
        diet_high_protein: form.diet_high_protein,
        diet_keto: form.diet_keto,
        diet_other: form.diet_other,
        gama: form.gama === "" ? null : Number(form.gama),
        momento_plato: form.momento_plato === ""
          ? null
          : (form.momento_plato as "aperitivo" | "entrante" | "principal" | "guarnicion" | "postre"),
        destacado: destacadoEn.length > 0,
        destacado_en: destacadoEn,
        primer_precio: form.primer_precio,
      });

      // Calculamos el score localmente con lo que se acaba de guardar (mismo criterio que el checklist).
      const localScore = computeOptimizationScore({
        name: form.name,
        short_description: form.short_description,
        long_description: form.long_description,
        primary_image: data.image_url ?? null,
        gallery: Array.isArray(data.gallery) ? data.gallery : data.image_url ? [data.image_url] : [],
        allergens: [],
        badges: form.badges
          ? String(form.badges).split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        pairings: form.pairings
          ? String(form.pairings).split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        nutrition: data.info_nutricional,
        format: form.format,
        origin: form.origin,
        brand_id: form.brand,
        category_id: form.family,
        seo_title: form.seo_title,
        seo_description: form.seo_description,
        // Cualquier flag dietético activo (8 toggles) hace pasar el criterio de "info dietética".
        diet_flags: [
          form.gluten_free,
          form.lactose_free,
          form.vegetarian,
          form.diet_no_nuts,
          form.diet_vegan,
          form.diet_no_added_sugar,
          form.diet_high_protein,
          form.diet_keto,
          !!form.diet_other && form.diet_other.trim().length > 0,
        ],
      });

      const refChanged = form.ref !== productRef;
      const refNote = refChanged ? ` · ref visible: ${form.ref}` : "";
      const slugNote = result.newSlug ? ` · slug: ${result.newSlug}` : "";

      // Aviso explícito si la ref alias NO se persistió (columna display_ref no existe).
      if (!metaResult.displayRefPersisted) {
        setMessage({
          kind: "err",
          text: `Guardado parcial: la referencia alias "${form.ref}" NO se persistió. Falta ejecutar en Supabase la migración 20260513_product_meta_display_ref.sql. Tras correrla, vuelve a guardar.`,
        });
      } else if (result.autoFilledFields && result.autoFilledFields.length > 0) {
        setMessage({
          kind: "ok",
          text: `Guardado · score ${localScore.total}/100 · rellenados por defecto: ${result.autoFilledFields.join(", ")}${refNote}${slugNote}`,
        });
      } else {
        setMessage({
          kind: "ok",
          text: `Guardado · score ${localScore.total}/100${refNote}${slugNote}`,
        });
      }

      router.refresh();
    } catch (e) {
      // Llegamos aquí sólo si fallan cosas no esperadas (red caída, 5xx, auth).
      // Los 400 de "campos obligatorios" ya se reconvierten a draft arriba.
      setMessage({ kind: "err", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Datalist global de familias — alimenta el autocomplete del input "Familia".
          Si el slug está inactivo en el overlay, se indica entre paréntesis. */}
      <datalist id="families-list">
        {families.map((f) => (
          <option key={f.slug} value={f.slug}>
            {f.display_name !== f.slug ? `${f.display_name} (${f.count} productos)` : `${f.count} productos`}
            {!f.active ? " · inactiva" : ""}
          </option>
        ))}
      </datalist>

      <div className="grid sm:grid-cols-2 gap-5">
        <Field
          label="Referencia (visible)"
          value={form.ref}
          onChange={(v) => set("ref", v)}
          placeholder={`canónica: ${productRef}`}
        />
        <Field label="Nombre" value={form.name} onChange={(v) => set("name", v)} />
        <Field label="Marca" value={form.brand} onChange={(v) => set("brand", v)} placeholder="ej. Maison Lafleur" />
        <Field
          label="Familia"
          value={form.family}
          onChange={(v) => set("family", v)}
          placeholder="QUESOS, FOIE_GRAS, …"
          listId="families-list"
        />
        <Field label="Origen" value={form.origin} onChange={(v) => set("origin", v)} />
        <Field
          label="Formato unitario"
          value={form.format}
          onChange={(v) => set("format", v)}
          placeholder="ej. 500 ml · 250 g · cuña"
        />
        <Field
          label="Unidades por caja"
          value={form.units_per_box}
          onChange={(v) => set("units_per_box", v)}
          type="number"
          placeholder="ej. 12"
        />
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
          onChange={(v) => set("status", v as typeof form.status)}
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
      <div className="space-y-1.5">
        <Textarea
          label="Descripción larga"
          value={form.long_description}
          onChange={(v) => set("long_description", v)}
          rows={8}
          action={aiButton("long_description", "Sugerir descripción larga", "long_description")}
        />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Acepta <strong>Markdown</strong>: doble enter para párrafo nuevo · <code>**negrita**</code> · <code>*cursiva*</code> · <code>- lista</code> · <code>[texto](url)</code>
        </p>
      </div>
      <Textarea
        label="Ingredientes"
        value={form.ingredients}
        onChange={(v) => set("ingredients", v)}
        rows={3}
      />
      <Textarea
        label="Información nutricional"
        value={form.info_nutricional}
        onChange={(v) => set("info_nutricional", v)}
        rows={6}
      />

      <div className="grid sm:grid-cols-2 gap-5">
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
      </div>

      <fieldset className="rounded-2xl border border-border p-5 space-y-4">
        <legend className="px-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Atributos dietéticos</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          <Toggle label="Sin gluten" checked={form.gluten_free} onChange={(v) => set("gluten_free", v)} />
          <Toggle label="Sin lactosa" checked={form.lactose_free} onChange={(v) => set("lactose_free", v)} />
          <Toggle label="Sin frutos secos" checked={form.diet_no_nuts} onChange={(v) => set("diet_no_nuts", v)} />
          <Toggle label="Vegano" checked={form.diet_vegan} onChange={(v) => set("diet_vegan", v)} />
          <Toggle label="Vegetariano" checked={form.vegetarian} onChange={(v) => set("vegetarian", v)} />
          <Toggle label="Sin azúcares añadidos" checked={form.diet_no_added_sugar} onChange={(v) => set("diet_no_added_sugar", v)} />
          <Toggle label="Alto en proteínas" checked={form.diet_high_protein} onChange={(v) => set("diet_high_protein", v)} />
          <Toggle label="Keto" checked={form.diet_keto} onChange={(v) => set("diet_keto", v)} />
        </div>
        <div className="pt-3 border-t border-border">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Otros (texto libre)</span>
            <input
              type="text"
              value={form.diet_other}
              onChange={(e) => set("diet_other", e.target.value)}
              placeholder="ej. Bajo en sodio, halal, kosher…"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-border p-5 space-y-4">
        <legend className="px-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Clasificación gastronómica</legend>
        <div className="grid sm:grid-cols-2 gap-5">
          <SelectField
            label="Gama"
            value={form.gama}
            onChange={(v) => set("gama", v)}
            options={[
              { value: "", label: "— sin asignar —" },
              { value: "1", label: "1ª gama · fresco sin procesar" },
              { value: "2", label: "2ª gama · conserva" },
              { value: "3", label: "3ª gama · congelado" },
              { value: "4", label: "4ª gama · fresco listo para consumir" },
              { value: "5", label: "5ª gama · cocinado refrigerado" },
              { value: "6", label: "6ª gama · liofilizado / deshidratado" },
            ]}
          />
          <SelectField
            label="Momento del plato"
            value={form.momento_plato}
            onChange={(v) => set("momento_plato", v as typeof form.momento_plato)}
            options={[
              { value: "", label: "— sin asignar —" },
              { value: "aperitivo", label: "Aperitivo" },
              { value: "entrante", label: "Entrante" },
              { value: "principal", label: "Principal" },
              { value: "guarnicion", label: "Guarnición" },
              { value: "postre", label: "Postre" },
            ]}
          />
        </div>
        <div className="pt-3 border-t border-border space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Destacado en</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Toggle label="HORECA" checked={form.destacado_horeca} onChange={(v) => set("destacado_horeca", v)} />
            <Toggle label="Retail" checked={form.destacado_retail} onChange={(v) => set("destacado_retail", v)} />
            <Toggle label="Quesos" checked={form.destacado_fromages} onChange={(v) => set("destacado_fromages", v)} />
          </div>
        </div>
        <div className="pt-3 border-t border-border">
          <Toggle label="Primer precio" checked={form.primer_precio} onChange={(v) => set("primer_precio", v)} />
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong>Destacado en</strong>: marca el producto como destacado en cada catálogo donde aparezca destacado (aparece en la sección &ldquo;Selección&rdquo; del hub correspondiente: /secrets-du-xef, /colmado o /quesos).
          <strong className="ml-2">Primer precio</strong>: indica que es la opción entry-level de su familia, útil para filtros del comercial.
        </p>
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

      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border">
        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-primary-foreground rounded-full px-7 py-3 font-medium hover:bg-accent transition-colors disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
        {message && (
          <p className={`text-sm ${message.kind === "ok" ? "text-emerald-600" : "text-destructive"}`}>
            {message.text}
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
  type = "text",
  step,
  placeholder,
  max,
  action,
  listId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
  max?: number;
  action?: ReactNode;
  /** Si se pasa, el input se enlaza a un <datalist id={listId}> para autocomplete. */
  listId?: string;
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
        list={listId}
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
