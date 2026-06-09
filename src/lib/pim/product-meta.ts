// Overlay de metadatos de producto en nuestro Supabase.
// Brand y diet extras se gestionan aquí, NO en la API del socio.

import { createPublicClient } from "@/integrations/supabase/server";

/** Momento del plato — slugs estables que guardamos en la BD.
 *  Para mostrar al usuario, ver MOMENTO_LABELS. */
export const MOMENTO_VALUES = [
  "aperitivo",
  "entrante",
  "principal",
  "guarnicion",
  "postre",
] as const;
export type MomentoPlato = (typeof MOMENTO_VALUES)[number];

export const MOMENTO_LABELS: Record<MomentoPlato, string> = {
  aperitivo: "Aperitivo",
  entrante: "Entrante",
  principal: "Principal",
  guarnicion: "Guarnición",
  postre: "Postre",
};

/** Gama de procesado del producto (clasificación clásica de la industria alimentaria). */
export const GAMA_LABELS: Record<number, string> = {
  1: "1ª gama · fresco sin procesar",
  2: "2ª gama · conserva",
  3: "3ª gama · congelado",
  4: "4ª gama · fresco listo para consumir",
  5: "5ª gama · cocinado refrigerado",
  6: "6ª gama · liofilizado / deshidratado",
};

export type ProductMeta = {
  product_ref: string;
  /** Alias editable de la referencia. La API trata `ref` como PK inmutable;
   * este campo es lo que mostramos al público y al editor cuando está presente. */
  display_ref?: string | null;
  brand_override?: string | null;
  diet_no_nuts: boolean;
  diet_vegan: boolean;
  diet_no_added_sugar: boolean;
  diet_high_protein: boolean;
  diet_keto: boolean;
  diet_other?: string | null;
  /** Gama de procesado del producto: 1=fresco, 2=conserva, …, 6=liofilizado. */
  gama?: number | null;
  /** Momento del plato: aperitivo, entrante, principal, guarnicion, postre. */
  momento_plato?: MomentoPlato | null;
  /** Legacy: flag global de destacado. Se mantiene por retrocompat pero la
   *  forma nueva de destacar es por catálogo (`destacado_en`). */
  destacado: boolean;
  /** Catálogos donde este producto aparece como destacado.
   *  Slugs típicos: 'horeca', 'retail', 'fromages'. */
  destacado_en: string[];
  /** Línea de entry-level / "primer precio" para filtros y comunicación HORECA. */
  primer_precio: boolean;
};

export const DIET_EXTRA_LABELS: Record<keyof Pick<ProductMeta,
  "diet_no_nuts" | "diet_vegan" | "diet_no_added_sugar" | "diet_high_protein" | "diet_keto"
>, string> = {
  diet_no_nuts: "Sin frutos secos",
  diet_vegan: "Vegano",
  diet_no_added_sugar: "Sin azúcares añadidos",
  diet_high_protein: "Alto en proteínas",
  diet_keto: "Keto",
};

export const EMPTY_META = (ref: string): ProductMeta => ({
  product_ref: ref,
  display_ref: null,
  brand_override: null,
  diet_no_nuts: false,
  diet_vegan: false,
  diet_no_added_sugar: false,
  diet_high_protein: false,
  diet_keto: false,
  diet_other: null,
  gama: null,
  momento_plato: null,
  destacado: false,
  destacado_en: [],
  primer_precio: false,
});

/** La ref que enseñamos al usuario: display_ref si existe, si no la canónica de la API. */
export function effectiveRef(meta: Pick<ProductMeta, "display_ref"> | null | undefined, apiRef: string): string {
  const dr = meta?.display_ref?.trim();
  return dr && dr.length > 0 ? dr : apiRef;
}

// effectiveBrand (+ matchesSearch) viven en ./search — puros y testeables sin
// dependencias de servidor. Se re-exportan aquí para no romper los imports
// existentes (`from "@/lib/pim/product-meta"`).
export { effectiveBrand, matchesSearch, SENTINEL_BRAND } from "./search";

export async function getProductMeta(ref: string): Promise<ProductMeta> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("product_meta")
    .select("*")
    .eq("product_ref", ref)
    .maybeSingle();
  if (error) {
    console.warn("[getProductMeta] error:", error.message);
    return EMPTY_META(ref);
  }
  return (data as ProductMeta | null) ?? EMPTY_META(ref);
}

export async function getMetasForProducts(refs: string[]): Promise<Record<string, ProductMeta>> {
  if (refs.length === 0) return {};
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("product_meta")
    .select("*")
    .in("product_ref", refs);
  if (error) {
    console.warn("[getMetasForProducts] error:", error.message);
    return {};
  }
  return Object.fromEntries(
    ((data ?? []) as unknown as ProductMeta[]).map((m) => [m.product_ref, m]),
  );
}
