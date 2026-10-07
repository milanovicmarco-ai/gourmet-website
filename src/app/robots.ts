import type { MetadataRoute } from "next";

const SITE_URL = "https://aurellano.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Evita que los bots barran combinaciones de filtros/búsqueda del
        // catálogo (cada una renderiza en servidor y consume CPU).
        disallow: ["/admin", "/api/", "/*?"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
