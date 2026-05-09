// Renames de campo entre el form del admin y el schema de la API.
//
// Convención: en el form del admin usamos los nombres en inglés que ya teníamos
// (short_description, long_description, badges, allergens, price_eur, etc.)
// porque ya está cableado así. El mapper traduce a los nombres reales de la API
// cuando enviamos, y al revés cuando leemos.

import type { ApiProduct } from "./api";

export type FormFields = {
  ref?: string;
  name?: string;
  slug?: string;
  family?: string;
  brand?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  origin?: string | null;
  flavor?: string | null;
  format?: string | null;
  price_eur?: number | string | null;
  status?: "draft" | "published" | "archived";
  seo_title?: string | null;
  seo_description?: string | null;
  badges?: string[] | string | null;
  pairings?: string[] | string | null;
  allergens?: string[] | string | null;
  ingredients?: string | null;
  // Booleans dietéticos
  vegan?: boolean;
  gluten_free?: boolean;
  lactose_free?: boolean;
};

const csv = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
};

/** Convierte nuestro form al payload que espera la API (POST /PUT). */
export function mapToApi(f: FormFields): Record<string, unknown> {
  const formatoOpciones =
    f.format && String(f.format).trim().length > 0
      ? [{ label: String(f.format).trim(), peso_kg: null, precio_eur: null }]
      : undefined;

  const payload: Record<string, unknown> = {
    name: f.name,
    slug: f.slug,
    family: f.family,
    brand: f.brand ?? undefined,
    descripcion_corta: f.short_description ?? undefined,
    description_rich: f.long_description ?? undefined,
    origen: f.origin ?? undefined,
    flavor: f.flavor ?? undefined,
    base_price_eur:
      f.price_eur === "" || f.price_eur == null ? undefined : Number(f.price_eur),
    status: f.status,
    seo_title: f.seo_title ?? undefined,
    seo_description: f.seo_description ?? undefined,
    tags: csv(f.badges),
    pairings: csv(f.pairings),
    alergenos: csv(f.allergens).join(", "),
    ingredientes: f.ingredients ?? undefined,
    sin_gluten: f.gluten_free,
    sin_lactosa: f.lactose_free,
    formato_opciones: formatoOpciones,
  };

  // No mandes claves con `undefined`: la API trata `null` y `ausente` distinto.
  return Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined),
  );
}

/** Convierte la respuesta de la API a los nombres del form. */
export function mapFromApi(p: ApiProduct): FormFields & { ref: string; image_url: string | null; optimization_score: number | null } {
  return {
    ref: p.ref,
    name: p.name,
    slug: p.slug ?? "",
    family: p.family ?? "",
    brand: p.brand ?? "",
    short_description: p.descripcion_corta ?? "",
    long_description: p.description_rich ?? "",
    origin: p.origen ?? "",
    flavor: p.flavor ?? "",
    format: p.formato_opciones?.[0]?.label ?? "",
    price_eur: p.base_price_eur ?? "",
    status: (p.status as FormFields["status"]) ?? (p.active === false ? "archived" : "published"),
    seo_title: p.seo_title ?? "",
    seo_description: p.seo_description ?? "",
    badges: p.tags ?? [],
    pairings: p.pairings ?? [],
    allergens: typeof p.alergenos === "string"
      ? p.alergenos
      : Array.isArray(p.alergenos) ? p.alergenos.join(", ") : "",
    ingredients: p.ingredientes ?? "",
    vegan: false,
    gluten_free: !!p.sin_gluten,
    lactose_free: !!p.sin_lactosa,
    image_url: p.image_url ?? null,
    optimization_score: p.optimization_score ?? null,
  };
}
