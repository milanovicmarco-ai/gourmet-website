import type { MetadataRoute } from "next";
import { products } from "@/lib/products";

const SITE_URL = "https://aurellano.com";

export default function sitemap(): MetadataRoute.Sitemap {
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

  const productRoutes = products.map((p) => ({
    url: `${SITE_URL}/producto/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes];
}
