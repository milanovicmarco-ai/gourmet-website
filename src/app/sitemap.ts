import type { MetadataRoute } from "next";
import { listProducts } from "@/lib/pim/api";
import { ROUTES, productPath } from "@/lib/i18n/routes";

const SITE_URL = "https://aurellano.com";

// El sitemap se regenera como máximo cada hora. Sin esto, cada hit de Googlebot
// a /sitemap.xml ejecutaba la función → listProducts → fetch al VPS (aunque
// el fetch fuera cacheado, había overhead). Con revalidate a nivel ruta, Next
// guarda el XML generado durante 1h.
export const revalidate = 3600;

/** Genera un par de entradas (ES + CA) para una page key, ambas con sus
 *  hreflang alternates apuntándose la una a la otra. Es lo que Google
 *  necesita para entender que son traducciones equivalentes. */
function pairFor(
  key: keyof typeof ROUTES,
  now: Date,
  priority: number,
): MetadataRoute.Sitemap {
  const esUrl = `${SITE_URL}${ROUTES[key].es}`;
  const caUrl = `${SITE_URL}${ROUTES[key].ca}`;
  const languages = { "es-ES": esUrl, "ca-ES": caUrl };
  return [
    { url: esUrl, lastModified: now, changeFrequency: "weekly" as const, priority, alternates: { languages } },
    { url: caUrl, lastModified: now, changeFrequency: "weekly" as const, priority, alternates: { languages } },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Home (es + ca)
  const homeLanguages = { "es-ES": `${SITE_URL}/es`, "ca-ES": `${SITE_URL}/ca` };
  const homeRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/es`, lastModified: now, changeFrequency: "weekly", priority: 1, alternates: { languages: homeLanguages } },
    { url: `${SITE_URL}/ca`, lastModified: now, changeFrequency: "weekly", priority: 1, alternates: { languages: homeLanguages } },
  ];

  // Páginas estáticas en sus dos idiomas con hreflang correcto
  const staticPairs: MetadataRoute.Sitemap = [
    ...pairFor("catalogo", now, 0.8),
    ...pairFor("quesos", now, 0.8),
    ...pairFor("foie", now, 0.7),
    ...pairFor("secrets", now, 0.8),
    ...pairFor("colmado", now, 0.8),
    ...pairFor("despensa", now, 0.7),
    ...pairFor("especialSin", now, 0.7),
    ...pairFor("sobre", now, 0.7),
    ...pairFor("contacto", now, 0.7),
    ...pairFor("inspirate", now, 0.7),
  ];

  // Productos: vienen de la API (Neon). Si está caída devolvemos sólo lo estático.
  // Cada producto sale dos veces: /es/producto/{slug} y /ca/producte/{slug},
  // ambas como alternates la una de la otra.
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    // limit=1000 cubre los 693 productos actuales tras el bulk import + margen.
    const { results } = await listProducts({ limit: 1000, revalidate: 3600 });
    for (const p of results) {
      if (p.active === false || !p.slug) continue;
      const esUrl = `${SITE_URL}${productPath("es", p.slug)}`;
      const caUrl = `${SITE_URL}${productPath("ca", p.slug)}`;
      const languages = { "es-ES": esUrl, "ca-ES": caUrl };
      productRoutes.push(
        { url: esUrl, lastModified: now, changeFrequency: "weekly", priority: 0.6, alternates: { languages } },
        { url: caUrl, lastModified: now, changeFrequency: "weekly", priority: 0.6, alternates: { languages } },
      );
    }
  } catch {
    // Sin API alcanzable: omitimos productos para no romper el sitemap.
  }

  return [...homeRoutes, ...staticPairs, ...productRoutes];
}
