import type { MetadataRoute } from "next";
import { listProducts } from "@/lib/pim/api";

const SITE_URL = "https://aurellano.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes = [
    "/",
    "/catalogo",
    "/quesos",
    "/foie",
    "/secrets-du-xef",
    "/colmado",
    "/despensa",
    "/especial-sin",
    "/sobre-nosotros",
    "/condiciones",
    "/contacto",
    "/inspiracion",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : 0.8,
  }));

  // Productos: vienen de la API (Neon). Si está caída devolvemos sólo las rutas estáticas.
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const { results } = await listProducts({ limit: 500, revalidate: 3600 });
    productRoutes = results
      .filter((p) => p.active !== false && !!p.slug)
      .map((p) => ({
        url: `${SITE_URL}/producto/${p.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
  } catch {
    // Sin API alcanzable: omitimos productos para no romper el sitemap.
  }

  return [...staticRoutes, ...productRoutes];
}
