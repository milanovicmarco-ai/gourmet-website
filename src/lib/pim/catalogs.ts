// Helpers para los catálogos de publicación (viven en NUESTRO Supabase).
//
// IMPORTANTE: estos catálogos NO están en la API del socio. La API del socio
// gestiona productos, marcas y familias; los "catálogos de publicación"
// (HORECA, Retail, Fromages, Selección Aurellano, etc.) son un concepto propio
// del PIM que vive en la tabla `catalogs` de nuestro Supabase, con la tabla
// `product_catalogs` para las asignaciones N:M.

import { createClient as createServerSupabase } from "@/integrations/supabase/server";

export type Catalog = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

/** Lee todos los catálogos. Por defecto sólo activos. */
export async function listCatalogs(includeInactive = false): Promise<Catalog[]> {
  const supabase = await createServerSupabase();
  let query = supabase.from("catalogs").select("*").order("sort_order").order("name");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown) as Catalog[];
}

/** Devuelve la lista de slugs de catálogo asignados a un producto. */
export async function getProductCatalogs(productRef: string): Promise<string[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("product_catalogs")
    .select("catalog_id, catalogs!inner(slug)")
    .eq("product_ref", productRef);
  if (error) throw error;
  return ((data ?? []) as unknown as { catalogs: { slug: string } | { slug: string }[] }[])
    .map((r) => {
      const c = Array.isArray(r.catalogs) ? r.catalogs[0] : r.catalogs;
      return c?.slug ?? "";
    })
    .filter(Boolean);
}

/** Mapa product_ref → slugs[] para varios productos. */
export async function getCatalogsForProducts(refs: string[]): Promise<Record<string, string[]>> {
  if (refs.length === 0) return {};
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("product_catalogs")
    .select("product_ref, catalogs!inner(slug)")
    .in("product_ref", refs);
  if (error) throw error;
  const map: Record<string, string[]> = {};
  for (const row of ((data ?? []) as unknown as { product_ref: string; catalogs: { slug: string } | { slug: string }[] }[])) {
    const c = Array.isArray(row.catalogs) ? row.catalogs[0] : row.catalogs;
    if (!c?.slug) continue;
    (map[row.product_ref] ??= []).push(c.slug);
  }
  return map;
}

/** Refs de productos asignados a un catálogo (por slug). */
export async function getRefsByCatalogSlug(slug: string): Promise<string[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("product_catalogs")
    .select("product_ref, catalogs!inner(slug)")
    .eq("catalogs.slug", slug);
  if (error) throw error;
  return ((data ?? []) as unknown as { product_ref: string }[]).map((r) => r.product_ref);
}

/** Humaniza un slug de familia: "FOIE_GRAS" → "Foie gras", "QUESOS" → "Quesos".
 *  Fallback usado cuando no hay display_name configurado en el overlay. */
export function humanizeFamilySlug(slug: string): string {
  if (!slug) return "";
  const lower = slug.toLowerCase().replace(/_+/g, " ").trim();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export type FamilyMeta = {
  slug: string;
  display_name: string | null;
  description: string | null;
  sort_order: number;
  active: boolean;
};

/** Devuelve mapa slug → meta para todas las familias del overlay. */
export async function getFamilyMetas(): Promise<Record<string, FamilyMeta>> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("families_meta").select("*");
  if (error) {
    console.warn("[getFamilyMetas] error:", error.message);
    return {};
  }
  return Object.fromEntries(
    ((data ?? []) as unknown as FamilyMeta[]).map((m) => [m.slug, m]),
  );
}

/** Lista combinada de familias: API (auto-descubiertas desde productos) + overlay
 *  (familias creadas en settings, posiblemente sin productos aún).
 *  Ordenadas por sort_order del overlay → alfabético. Útil para dropdowns. */
export async function listAllFamilies(): Promise<
  { slug: string; display_name: string; active: boolean; count: number }[]
> {
  const { listFamilies } = await import("./api");
  const [apiFamilies, metas] = await Promise.all([
    listFamilies().catch(() => []),
    getFamilyMetas().catch(() => ({} as Record<string, FamilyMeta>)),
  ]);

  const apiSlugs = new Set(apiFamilies.map((f) => f.family));
  const merged = new Map<string, { slug: string; display_name: string; active: boolean; count: number; sort: number }>();

  for (const f of apiFamilies) {
    const m = metas[f.family];
    merged.set(f.family, {
      slug: f.family,
      display_name: m?.display_name?.trim() || f.family,
      active: m?.active ?? true,
      count: f.count,
      sort: m?.sort_order ?? 9999,
    });
  }
  for (const [slug, m] of Object.entries(metas)) {
    if (apiSlugs.has(slug)) continue;
    merged.set(slug, {
      slug,
      display_name: m.display_name?.trim() || slug,
      active: m.active,
      count: 0,
      sort: m.sort_order ?? 9999,
    });
  }

  return Array.from(merged.values())
    .sort((a, b) => a.sort - b.sort || a.display_name.localeCompare(b.display_name))
    .map(({ slug, display_name, active, count }) => ({ slug, display_name, active, count }));
}
