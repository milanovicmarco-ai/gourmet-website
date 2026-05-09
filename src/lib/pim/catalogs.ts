// Helpers para los catálogos de publicación (viven en NUESTRO Supabase, no en la API del socio).

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

/** Lee todos los catálogos activos. */
export async function listCatalogs(includeInactive = false): Promise<Catalog[]> {
  const supabase = await createServerSupabase();
  let query = supabase.from("catalogs").select("*").order("sort_order").order("name");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Catalog[];
}

/** Devuelve la lista de slugs de catálogo asignados a un producto. */
export async function getProductCatalogs(productRef: string): Promise<string[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("product_catalogs")
    .select("catalog_id, catalogs!inner(slug)")
    .eq("product_ref", productRef);
  if (error) throw error;
  return (data ?? []).map((r: { catalogs: { slug: string } | { slug: string }[] }) => {
    const c = Array.isArray(r.catalogs) ? r.catalogs[0] : r.catalogs;
    return c?.slug ?? "";
  }).filter(Boolean);
}

/** Devuelve un mapa product_ref → slugs[] para varios productos. */
export async function getCatalogsForProducts(refs: string[]): Promise<Record<string, string[]>> {
  if (refs.length === 0) return {};
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("product_catalogs")
    .select("product_ref, catalogs!inner(slug)")
    .in("product_ref", refs);
  if (error) throw error;
  const map: Record<string, string[]> = {};
  for (const row of (data ?? []) as { product_ref: string; catalogs: { slug: string } | { slug: string }[] }[]) {
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
  return (data ?? []).map((r) => r.product_ref);
}
