// Score de optimización del PIM. Devuelve un número 0-100 + el desglose por criterio.

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
      weight: 10,
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
      weight: 10,
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
      label: "Badges (DOP, Premium, etc.)",
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
      key: "price",
      label: "Precio",
      weight: 5,
      passed: typeof p.price_eur === "number" && p.price_eur > 0,
    },
    {
      key: "brand",
      label: "Marca asignada",
      weight: 5,
      passed: !!p.brand_id,
    },
    {
      key: "category",
      label: "Categoría asignada",
      weight: 5,
      passed: !!p.category_id,
    },
    {
      key: "seo",
      label: "SEO: title y description",
      weight: 10,
      passed: !!p.seo_title && !!p.seo_description,
    },
  ];

  const total = criteria.reduce((acc, c) => acc + (c.passed ? c.weight : 0), 0);
  return { total, criteria };
}
