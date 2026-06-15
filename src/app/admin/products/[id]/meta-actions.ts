"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/integrations/supabase/server";
import { MOMENTO_VALUES, type ProductMeta } from "@/lib/pim/product-meta";
import { revalidatePublicListings } from "@/lib/pim/revalidate-public";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return supabase;
}

export type SaveMetaResult = {
  /** false si la columna display_ref no existe todavía y se reintentó sin ella.
   *  El editor del PIM lo usa para mostrar un warning visible al usuario. */
  displayRefPersisted: boolean;
};

export async function saveProductMeta(meta: Omit<ProductMeta, never>): Promise<SaveMetaResult> {
  const supabase = await requireAdmin();

  // display_ref se guarda SÓLO si difiere de la ref canónica de la API. Si el usuario
  // lo deja igual, no creamos override (= la web pública usa la ref de la API).
  const displayRefTrim = meta.display_ref?.trim() ?? "";
  const displayRef =
    displayRefTrim.length > 0 && displayRefTrim !== meta.product_ref
      ? displayRefTrim
      : null;
  const userWantsOverride = displayRef !== null;

  // Validación defensiva del momento (sólo aceptamos slugs del enum).
  const momento =
    meta.momento_plato && MOMENTO_VALUES.includes(meta.momento_plato)
      ? meta.momento_plato
      : null;

  // Gama: aceptamos 1-6, fuera de rango se guarda como null.
  const gama =
    meta.gama != null && Number.isFinite(meta.gama) && meta.gama >= 1 && meta.gama <= 6
      ? Math.floor(meta.gama)
      : null;

  // destacado_en: limpia espacios y filtra a slugs no vacíos.
  const destacadoEn = Array.isArray(meta.destacado_en)
    ? meta.destacado_en.map((s) => s.trim()).filter(Boolean)
    : [];

  const payload = {
    product_ref: meta.product_ref,
    display_ref: displayRef,
    brand_override: meta.brand_override?.trim() || null,
    diet_no_nuts: !!meta.diet_no_nuts,
    diet_vegan: !!meta.diet_vegan,
    diet_no_added_sugar: !!meta.diet_no_added_sugar,
    diet_high_protein: !!meta.diet_high_protein,
    diet_keto: !!meta.diet_keto,
    diet_other: meta.diet_other?.trim() || null,
    gama,
    momento_plato: momento,
    // Mantenemos `destacado` legacy en sincronía: si hay al menos un catálogo
    // marcado, el flag global queda en true. Útil para queries antiguas y para
    // que el filtro "Especialidad → Destacado" del catálogo público siga funcionando.
    destacado: destacadoEn.length > 0 || !!meta.destacado,
    destacado_en: destacadoEn,
    primer_precio: !!meta.primer_precio,
  };

  // Reintento defensivo: si alguna columna nueva (display_ref, gama, momento_plato,
  // destacado, primer_precio) aún no existe porque Marco no ha corrido la migración
  // correspondiente, hacemos un upsert quitando las columnas que falten para no
  // bloquear el guardado del resto del overlay. Marcamos `displayRefPersisted=false`
  // si fue ese el campo conflictivo, para que el editor avise.
  const CONDITIONAL_COLUMNS = [
    "display_ref",
    "gama",
    "momento_plato",
    "destacado",
    "primer_precio",
    "destacado_en",
  ] as const;
  type ConditionalCol = (typeof CONDITIONAL_COLUMNS)[number];

  let displayRefPersisted = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let workingPayload: Record<string, any> = { ...payload };
  let attempts = 0;
  let lastError: { message: string } | null = null;

  while (attempts < CONDITIONAL_COLUMNS.length + 1) {
    const { error } = await supabase
      .from("product_meta")
      .upsert(workingPayload, { onConflict: "product_ref" });
    if (!error) {
      lastError = null;
      break;
    }
    lastError = error;

    // ¿El error menciona una de las columnas opcionales?
    const culprit = CONDITIONAL_COLUMNS.find((col) => {
      const re = new RegExp(`\\b${col}\\b`, "i");
      return re.test(error.message);
    }) as ConditionalCol | undefined;

    const looksLikeMissingColumn = /column|schema cache|not found|does not exist/i.test(
      error.message,
    );
    if (!culprit || !looksLikeMissingColumn) break;

    console.warn(
      `[saveProductMeta] columna "${culprit}" no existe todavía — falta la migración correspondiente. La quito del payload y reintento.`,
    );
    if (culprit === "display_ref") displayRefPersisted = false;
    delete workingPayload[culprit];
    attempts++;
  }

  if (lastError) throw new Error(lastError.message);

  revalidatePath(`/admin/products/${meta.product_ref}`);
  revalidatePath("/admin/products");
  // Cambios de meta (brand_override, dietas, display_ref) impactan las
  // listas y agrupaciones públicas. La página de detalle del producto
  // expira en 1h por revalidate; no la invalidamos aquí porque no
  // tenemos el slug a mano y un override de meta no suele ser urgente.
  await revalidatePublicListings();

  // Sólo reportamos "no persistido" si el usuario realmente quería un override.
  // Si dejó la ref igual a la canónica, da igual que la columna no exista.
  return { displayRefPersisted: !userWantsOverride || displayRefPersisted };
}
