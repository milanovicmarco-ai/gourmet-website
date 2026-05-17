// Constantes de marca · única fuente de verdad para naming, claim y description.
//
// Si Marco quiere cambiar el nombre comercial, claim o descripción corporativa,
// se modifica AQUÍ y se propaga a:
//   - SEO metadata (title template, OG, Twitter)
//   - Schema.org (Organization, FoodEstablishment)
//   - Home (eyebrow, h1, p descripción)
//   - Footer (badge superior, copyright)
//   - Cualquier copy que importe BRAND.

/** Naming oficial · invariante entre idiomas (siempre en catalán). */
export const BRAND_NAME = "Aurellano Productes Gastronòmics";

export const BRAND = {
  es: {
    name: BRAND_NAME,
    short: "Aurellano",
    claim: "Tu partner gastronómico",
    claimSub: "de confianza",
    description:
      "Especialistas en distribución de productos gourmet para restaurantes, hoteles y tiendas especializadas.",
  },
  ca: {
    name: BRAND_NAME,
    short: "Aurellano",
    claim: "El teu partner gastronòmic",
    claimSub: "de confiança",
    description:
      "Especialistes en distribució de productes gourmet per restaurants, hotels i botigues especialitzades.",
  },
} as const;

export type BrandLocale = keyof typeof BRAND;

/** Helper para el head: title pattern "{page} | {naming}" cap a 60 chars. */
export const SEO_TITLE_TEMPLATE = `%s | ${BRAND_NAME}`;
