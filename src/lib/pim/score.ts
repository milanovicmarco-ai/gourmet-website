// Score de optimización del PIM. Devuelve un número 0-100 + el desglose por criterio.
//
// La función trabaja con un shape genérico (PimProduct) que soporta tanto el
// schema antiguo de Supabase como el de la API actual (Neon). El helper
// `adaptApiProduct` convierte un ApiProduct a esta forma para que el checklist
// pueda evaluarse en el cliente y darle feedback visual al editor.

import type { ApiProduct } from "./api";

export type PimProduct = {
  name?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  primary_image?: string | null;
  gallery?: string[] | null;
  allergens?: string[] | null;
  badges?: string[] | null;
  pairings?: string[] | null;
  nutrition?: unknown;
  price_eur?: number | null;
  format?: string | null;
  origin?: string | null;
  brand_id?: string | null;
  category_id?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  /** Cualquier flag dietético activo (sin gluten, sin lactosa, vegano…) cuenta
   * como información dietética declarada en el score. */
  diet_flags?: boolean[];
};

export type ScoreCriterion = {
  key: string;
  label: string;
  weight: number;
  passed: boolean;
  hint?: string;
};

export type ScoreResult = {
  total: number;
  criteria: ScoreCriterion[];
};

export function computeOptimizationScore(p: PimProduct): ScoreResult {
  // Pesos suman exactamente 100. Sin "precio" (Aurellano no muestra precios públicos).

  // Nutrición rellena: aceptamos string con contenido O objeto con al menos un valor relleno.
  const nutritionFilled = (() => {
    const n = p.nutrition;
    if (n == null) return false;
    if (typeof n === "string") return n.trim().length > 0;
    if (typeof n === "object") {
      return Object.values(n as Record<string, unknown>).some(
        (v) => v != null && String(v).trim().length > 0,
      );
    }
    return false;
  })();

  const criteria: ScoreCriterion[] = [
    {
      key: "name",
      label: "Tiene nombre",
      weight: 5,
      passed: !!p.name && p.name.length >= 3,
    },
    {
      key: "short_description",
      label: "Descripción corta ≥ 60 caracteres",
      weight: 15,
      passed: !!p.short_description && p.short_description.length >= 60,
    },
    {
      key: "long_description",
      label: "Descripción larga ≥ 200 caracteres",
      weight: 15,
      passed: !!p.long_description && p.long_description.length >= 200,
    },
    {
      key: "primary_image",
      label: "Imagen principal",
      weight: 15,
      passed: !!p.primary_image,
    },
    {
      key: "gallery",
      label: "Galería con ≥ 2 imágenes",
      weight: 10,
      passed: Array.isArray(p.gallery) && (p.gallery?.length ?? 0) >= 2,
    },
    {
      key: "nutrition",
      label: "Info dietética / nutricional (alérgenos, flags o tabla)",
      weight: 5,
      // Pasa con CUALQUIERA de: tabla nutricional rellena, alérgenos declarados,
      // o algún flag dietético (sin gluten, sin lactosa, vegano, …) activo.
      passed:
        nutritionFilled ||
        (Array.isArray(p.allergens) && p.allergens.length > 0) ||
        (Array.isArray(p.diet_flags) && p.diet_flags.some(Boolean)),
    },
    {
      key: "pairings",
      label: "Maridajes / sugerencias",
      weight: 5,
      passed: Array.isArray(p.pairings) && (p.pairings?.length ?? 0) > 0,
    },
    {
      key: "badges",
      label: "Badges / tags",
      weight: 5,
      passed: Array.isArray(p.badges) && (p.badges?.length ?? 0) > 0,
    },
    {
      key: "format",
      label: "Formato (peso / unidades)",
      weight: 5,
      passed: !!p.format && p.format.length > 0,
    },
    {
      key: "origin",
      label: "Origen",
      weight: 5,
      passed: !!p.origin && p.origin.length > 0,
    },
    {
      key: "brand",
      label: "Marca asignada",
      weight: 5,
      passed: !!p.brand_id,
    },
    {
      key: "category",
      label: "Familia / categoría asignada",
      weight: 5,
      passed: !!p.category_id,
    },
    {
      key: "seo",
      label: "SEO: title y description",
      weight: 5,
      passed: !!p.seo_title && !!p.seo_description,
    },
  ];

  const raw = criteria.reduce((acc, c) => acc + (c.passed ? c.weight : 0), 0);
  // Cap defensivo a 100 (debería sumar exactamente 100 con todos los pasos).
  return { total: Math.min(100, raw), criteria };
}

/** Meta de overlay (Supabase) que enriquece el scoring con flags dietéticos extra
 * y con el `brand_override` (la marca real, ya que la API trata `brand` como FK estricta
 * y nosotros no la enviamos). */
type ScoreMeta = {
  brand_override?: string | null;
  diet_no_nuts?: boolean;
  diet_vegan?: boolean;
  diet_no_added_sugar?: boolean;
  diet_high_protein?: boolean;
  diet_keto?: boolean;
  diet_other?: string | null;
} | null | undefined;

/**
 * Adapta el shape de la API (Neon) al shape genérico que entiende
 * `computeOptimizationScore`. Si pasas `meta` (nuestro overlay de Supabase),
 * sus flags dietéticos también cuentan para el criterio de info dietética.
 */
export function adaptApiProduct(p: ApiProduct, meta?: ScoreMeta): PimProduct {
  const allergens = typeof p.alergenos === "string"
    ? p.alergenos.split(",").map((s) => s.trim()).filter(Boolean)
    : Array.isArray(p.alergenos) ? p.alergenos : [];

  // Galería real si la API la trae; si no, fallback a image_url.
  const realGallery: string[] = Array.isArray(p.gallery)
    ? (p.gallery as string[])
    : p.image_url
      ? [p.image_url]
      : [];

  return {
    name: p.name,
    short_description: p.descripcion_corta ?? null,
    long_description: p.description_rich ?? null,
    primary_image: p.image_url ?? null,
    gallery: realGallery,
    allergens,
    badges: p.tags ?? [],
    pairings: p.pairings ?? [],
    nutrition: p.info_nutricional ?? null,
    price_eur: p.base_price_eur ?? null,
    format: p.formato_opciones?.[0]?.label ?? null,
    origin: p.origen ?? null,
    // El score considera "marca asignada" si hay brand_override (lo que muestra el público)
    // O brand canónico de la API. Lo primero es lo habitual ya que no enviamos brand a la API.
    brand_id: (meta?.brand_override?.trim() || p.brand) ?? null,
    category_id: p.family ?? null,
    seo_title: p.seo_title ?? null,
    seo_description: p.seo_description ?? null,
    diet_flags: [
      !!p.sin_gluten,
      !!p.sin_lactosa,
      !!p.vegetariano,
      !!meta?.diet_no_nuts,
      !!meta?.diet_vegan,
      !!meta?.diet_no_added_sugar,
      !!meta?.diet_high_protein,
      !!meta?.diet_keto,
      !!(meta?.diet_other && meta.diet_other.trim().length > 0),
    ],
  };
}
