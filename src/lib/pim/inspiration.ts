// Helpers para los "catálogos de inspiración" (PDFs públicos con carátula + logo).
//
// Source of truth: tabla `inspiration_catalogs` + bucket Storage `inspiration` en
// nuestro Supabase. Lectura pública (RLS); escritura sólo admin.

import { createClient as createServerSupabase } from "@/integrations/supabase/server";

export type InspirationCatalog = {
  id: string;
  title: string;
  pdf_url: string;
  cover_url: string;
  logo_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

/** Lista pública: sólo activos, ordenados por sort_order. */
export async function listActiveInspirationCatalogs(): Promise<InspirationCatalog[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("inspiration_catalogs")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("[listActiveInspirationCatalogs] error:", error.message);
    return [];
  }
  return (data ?? []) as unknown as InspirationCatalog[];
}

/** Lista admin: todos, ordenados igual. */
export async function listAllInspirationCatalogs(): Promise<InspirationCatalog[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("inspiration_catalogs")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("[listAllInspirationCatalogs] error:", error.message);
    return [];
  }
  return (data ?? []) as unknown as InspirationCatalog[];
}
