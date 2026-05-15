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
  // Pesos suman exactamente 100. Si añades/quitas criterios, recuerda mantener el total.
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
      weight: 10,
      passed: !!p.short_description && p.short_description.length >= 60,
    },
    {
      key: "long_description",
      label: "Descripción larga ≥ 200 caracteres",
      weight: 10,
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
      key: "allergens",
      label: "Alérgenos declarados (o vacío explícito)",
      weight: 10,
      passed: Array.isArray(p.allergens),
    },
    {
      key: "nutrition",
      label: "Información nutricional",
      weight: 5,
      passed: !!p.nutrition && typeof p.nutrition === "object",
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

/**
 * Adapta el shape de la API (Neon) al shape genérico que entiende
 * `computeOptimizationScore`.
 */
export function adaptApiProduct(p: ApiProduct): PimProduct {
  const allergens = typeof p.alergenos === "string"
    ? p.alergenos.split(",").map((s) => s.trim()).filter(Boolean)
    : Array.isArray(p.alergenos) ? p.alergenos : [];

  return {
    name: p.name,
    short_description: p.descripcion_corta ?? null,
    long_description: p.description_rich ?? null,
    primary_image: p.image_url ?? null,
    gallery: p.gallery ?? [],
    allergens,
    badges: p.tags ?? [],
    pairings: p.pairings ?? [],
    nutrition: p.info_nutricional ?? null,
    price_eur: p.base_price_eur ?? null,
    format: p.formato_opciones?.[0]?.label ?? null,
    origin: p.origen ?? null,
    brand_id: p.brand ?? null,
    category_id: p.family ?? null,
    seo_title: p.seo_title ?? null,
    seo_description: p.seo_description ?? null,
  };
}
