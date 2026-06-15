// Helpers para gestionar las traducciones de producto en nuestro Supabase.
// La fuente canónica es la API del socio (siempre en español). Estas son traducciones overlay.

import { createClient } from "@/integrations/supabase/server";

export type Locale = "ca" | "en";

export type ProductTranslation = {
  product_ref: string;
  locale: Locale;
  name?: string | null;
  descripcion_corta?: string | null;
  description_rich?: string | null;
  flavor?: string | null;
  origen?: string | null;
  ingredientes?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  updated_at?: string;
};

/** Trae la traducción de un producto en un idioma concreto. null si no hay. */
export async function getTranslation(
  ref: string,
  locale: Locale,
): Promise<ProductTranslation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_translations")
    .select("*")
    .eq("product_ref", ref)
    .eq("locale", locale)
    .maybeSingle();
  if (error) {
    // No rompemos la página si el overlay falla; cae a ES.
    console.warn("[getTranslation] error:", error.message);
    return null;
  }
  return data as ProductTranslation | null;
}

/** Trae en bulk las traducciones de varios productos para un locale.
 *  Devuelve un dict { [product_ref]: translation } — vacío si no hay.
 *  Para listados (catálogo público, secciones temáticas) que renderizan
 *  decenas o cientos de productos sin caer en N+1 queries. */
export async function getTranslationsForProducts(
  refs: string[],
  locale: Locale,
): Promise<Record<string, ProductTranslation>> {
  if (refs.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_translations")
    .select("*")
    .in("product_ref", refs)
    .eq("locale", locale);
  if (error) {
    console.warn("[getTranslationsForProducts] error:", error.message);
    return {};
  }
  const out: Record<string, ProductTranslation> = {};
  for (const t of (data ?? []) as ProductTranslation[]) {
    out[t.product_ref] = t;
  }
  return out;
}
