// Configuración central de rutas multilingües.
//
// Cada "page key" tiene su URL en español y en catalán. El switcher de idioma,
// el sitemap, el middleware y los hreflang de cada wrapper se alimentan de aquí.
// Una sola fuente de verdad evita drift entre los distintos lados del routing.

export type Lang = "es" | "ca";

export const LANGS: Lang[] = ["es", "ca"];

/** Idioma por defecto cuando entra a / sin preferencia detectable. */
export const DEFAULT_LANG: Lang = "ca";

/** Diccionario maestro: cada page key → URL en cada idioma. */
export const ROUTES = {
  home:        { es: "/es",                  ca: "/ca" },
  catalogo:    { es: "/es/catalogo",         ca: "/ca/cataleg" },
  colmado:     { es: "/es/colmado",          ca: "/ca/colmado" },
  secrets:     { es: "/es/secrets-du-xef",   ca: "/ca/secrets-du-xef" },
  quesos:      { es: "/es/quesos",           ca: "/ca/formatges" },
  sobre:       { es: "/es/sobre-nosotros",   ca: "/ca/sobre-nosaltres" },
  contacto:    { es: "/es/contacto",         ca: "/ca/contacte" },
  inspirate:   { es: "/es/inspirate",        ca: "/ca/inspira-t" },
  consejos:    { es: "/es/consejos",         ca: "/ca/consells" },
  foie:        { es: "/es/foie",             ca: "/ca/foie" },
  despensa:    { es: "/es/despensa",         ca: "/ca/rebost" },
  especialSin: { es: "/es/especial-sin",     ca: "/ca/especial-sense" },
} as const satisfies Record<string, Record<Lang, string>>;

export type RouteKey = keyof typeof ROUTES;

/** Producto: dinámico. Lo gestionamos aparte porque el slug del producto
 *  viene del PIM y no es traducible por nuestro lado (los nombres son únicos
 *  por producto y los servimos tal cual). Solo se traduce el segmento "producto/producte". */
export function productPath(lang: Lang, slug: string): string {
  return lang === "ca" ? `/ca/producte/${slug}` : `/es/producto/${slug}`;
}

/** Dada una URL del sitio, encuentra la equivalencia en el otro idioma.
 *  Si la ruta no es traducible (p. ej. una fija sin entrada en ROUTES), devuelve
 *  el home del idioma destino como fallback razonable. */
export function getEquivalentPath(currentPath: string, targetLang: Lang): string {
  const cleaned = currentPath.replace(/\/$/, "") || "/";

  // 1) Match directo en la tabla
  for (const entry of Object.values(ROUTES)) {
    for (const lang of LANGS) {
      if (entry[lang] === cleaned) {
        return entry[targetLang];
      }
    }
  }

  // 2) Producto: /es/producto/{slug} ↔ /ca/producte/{slug}
  const productMatch = cleaned.match(/^\/(es|ca)\/(producto|producte)\/(.+)$/);
  if (productMatch) {
    const [, , , slug] = productMatch;
    return productPath(targetLang, slug);
  }

  // 3) Catch-all: misma jerarquía pero cambiando el prefix de idioma.
  // Útil para rutas no listadas explícitamente (admin, api, etc. — aunque
  // /admin no debería estar localizado).
  if (cleaned.startsWith("/es/")) {
    return cleaned.replace(/^\/es\//, `/${targetLang}/`);
  }
  if (cleaned.startsWith("/ca/")) {
    return cleaned.replace(/^\/ca\//, `/${targetLang}/`);
  }

  return ROUTES.home[targetLang];
}

/** Extrae el idioma del primer segmento del pathname.
 *  Si no empieza por /es o /ca, devuelve DEFAULT_LANG. */
export function getLangFromPath(pathname: string): Lang {
  if (pathname.startsWith("/ca/") || pathname === "/ca") return "ca";
  if (pathname.startsWith("/es/") || pathname === "/es") return "es";
  return DEFAULT_LANG;
}

/** Map "URL vieja" (legacy de antes del refactor i18n) → page key. Lo usa
 *  next.config.ts para generar redirects 308 que preservan el SEO. */
export const LEGACY_REDIRECTS: { from: string; to: RouteKey }[] = [
  { from: "/quesos",          to: "quesos" },
  { from: "/colmado",         to: "colmado" },
  { from: "/secrets-du-xef",  to: "secrets" },
  { from: "/sobre-nosotros",  to: "sobre" },
  { from: "/contacto",        to: "contacto" },
  { from: "/catalogo",        to: "catalogo" },
  { from: "/inspiracion",     to: "inspirate" },
  { from: "/consejos",        to: "consejos" },
  { from: "/foie",            to: "foie" },
  { from: "/despensa",        to: "despensa" },
  { from: "/especial-sin",    to: "especialSin" },
];
