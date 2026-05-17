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
  units_per_box?: number | string | null;
  price_eur?: number | string | null;
  status?: "draft" | "published" | "archived";
  seo_title?: string | null;
  seo_description?: string | null;
  badges?: string[] | string | null;
  pairings?: string[] | string | null;
  allergens?: string[] | string | null;
  ingredients?: string | null;
  /** Información nutricional como texto libre (Markdown / tabla manual).
   *  La API la tipa como `unknown` así que aceptamos cualquier string. */
  info_nutricional?: string | null;
  // Booleans dietéticos (los 3 que tiene la API canónica)
  vegan?: boolean;
  vegetarian?: boolean;
  gluten_free?: boolean;
  lactose_free?: boolean;
};

const csv = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
};

/** slug URL-safe: minúsculas, sin acentos, no-alfanum → guiones, sin duplicados. */
const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Convierte nuestro form al payload que espera la API (POST /PUT).
 *
 * Reglas defensivas: NO se mandan strings vacíos. Si un campo opcional viene "",
 * lo omitimos para no sobreescribir lo que haya en BBDD con vacío.
 */
export function mapToApi(f: FormFields): Record<string, unknown> {
  const s = (v: unknown): string | undefined => {
    if (v == null) return undefined;
    const str = String(v).trim();
    return str.length === 0 ? undefined : str;
  };

  const formatoLabel = s(f.format);
  const formatoOpciones = formatoLabel
    ? [{ label: formatoLabel, peso_kg: null, precio_eur: null }]
    : undefined;

  const tags = csv(f.badges);
  const pairings = csv(f.pairings);
  const allergensArr = csv(f.allergens);

  // Regeneramos el slug en cada save para que el URL público refleje el nombre y
  // la ref actuales. La API trata `ref` como PK inmutable, así que NO la enviamos
  // — el override editable vive en product_meta (Supabase) como display_ref.
  const nameForSlug = s(f.name);
  const refForSlug = s(f.ref);
  const slug =
    nameForSlug && refForSlug
      ? `${slugify(nameForSlug)}-${slugify(refForSlug)}`
      : undefined;

  const payload: Record<string, unknown> = {
    name: s(f.name),
    slug,
    family: s(f.family),
    // Brand NUNCA viaja a la API: tiene FK estricta a su tabla `brands` y eso
    // genera fricción innecesaria. La marca real (texto libre) vive en
    // product_meta.brand_override (Supabase) y se aplica como overlay en la web.
    // Si el backend exige marca para publicar, el retry de actions.ts inyecta un
    // sentinel "Aurellano" (auto-creado en su tabla) sólo para pasar el gate.
    descripcion_corta: s(f.short_description),
    description_rich: s(f.long_description),
    origen: s(f.origin),
    flavor: s(f.flavor),
    base_price_eur:
      f.price_eur === "" || f.price_eur == null ? undefined : Number(f.price_eur),
    units_per_box:
      f.units_per_box === "" || f.units_per_box == null
        ? undefined
        : Number(f.units_per_box),
    status: f.status,
    seo_title: s(f.seo_title),
    seo_description: s(f.seo_description),
    tags: tags.length ? tags : undefined,
    pairings: pairings.length ? pairings : undefined,
    alergenos: allergensArr.length ? allergensArr.join(", ") : undefined,
    ingredientes: s(f.ingredients),
    // La API exige un dict (no string). Si el editor escribió texto libre, lo
    // envolvemos como { texto: "..." } para que pase la validación. mapFromApi
    // lo desenvuelve al cargar para que el editor vea siempre el texto.
    info_nutricional: (() => {
      const v = s(f.info_nutricional);
      return v ? { texto: v } : undefined;
    })(),
    sin_gluten: f.gluten_free,
    sin_lactosa: f.lactose_free,
    vegetariano: f.vegetarian,
    formato_opciones: formatoOpciones,
  };

  // Quitar todas las claves con undefined: la API trata "ausente" como "no cambiar".
  return Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined),
  );
}

/** Convierte la respuesta de la API a los nombres del form. */
export function mapFromApi(p: ApiProduct): FormFields & { ref: string; image_url: string | null; gallery: string[]; optimization_score: number | null } {
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
    units_per_box: p.units_per_box ?? "",
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
    info_nutricional: (() => {
      const raw = p.info_nutricional;
      if (raw == null) return "";
      if (typeof raw === "string") return raw;
      // Forma envuelta { texto: "..." } — desenvolvemos para el editor.
      if (typeof raw === "object" && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;
        if (typeof obj.texto === "string") return obj.texto;
        // Cualquier otra forma de dict → la serializamos como JSON legible
        // para que el editor pueda corregirla a mano si hace falta.
        return JSON.stringify(obj, null, 2);
      }
      return "";
    })(),
    vegan: false,
    gluten_free: !!p.sin_gluten,
    lactose_free: !!p.sin_lactosa,
    image_url: p.image_url ?? null,
    gallery: Array.isArray(p.gallery) ? p.gallery : (p.image_url ? [p.image_url] : []),
    optimization_score: p.optimization_score ?? null,
  };
}
