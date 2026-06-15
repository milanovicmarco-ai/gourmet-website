"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/integrations/supabase/server";
import { revalidatePublicListings } from "@/lib/pim/revalidate-public";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return { supabase, user };
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ============================
// CATÁLOGOS (Supabase)
// ============================
export async function createCatalog(input: {
  slug?: string;
  name: string;
  description?: string;
  color?: string;
  sort_order?: number;
}) {
  const { supabase } = await requireAdmin();
  const slug = (input.slug?.trim() || slugify(input.name)).slice(0, 64);
  const { data, error } = await supabase
    .from("catalogs")
    .insert({
      slug,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      color: input.color || "#fa2ca2",
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings/catalogs");
  return data;
}

export async function updateCatalog(id: string, input: {
  slug?: string;
  name?: string;
  description?: string | null;
  color?: string;
  sort_order?: number;
  active?: boolean;
}) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("catalogs")
    .update({
      ...(input.slug !== undefined && { slug: input.slug.trim() }),
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description?.trim() || null }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.sort_order !== undefined && { sort_order: input.sort_order }),
      ...(input.active !== undefined && { active: input.active }),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings/catalogs");
  revalidatePath("/admin/products");
}

export async function deleteCatalog(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("catalogs").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings/catalogs");
  revalidatePath("/admin/products");
}

// ============================
// FAMILIAS · overlay families_meta
// ============================
export async function upsertFamilyMeta(input: {
  slug: string;
  display_name?: string | null;
  description?: string | null;
  sort_order?: number;
  active?: boolean;
}) {
  const { supabase } = await requireAdmin();

  // 1) Sincroniza con la API del socio: si la familia no existe en su backend,
  // la creamos vía POST /catalog/families.
  const { ensureFamilyExists } = await import("../products/actions");
  const check = await ensureFamilyExists(input.slug, input.display_name ?? null);
  if (check.ok !== true) {
    console.warn(
      `[upsertFamilyMeta] no se pudo crear "${input.slug}" en la API del socio (${check.reason}). Guardo igual en el overlay.`,
    );
  }

  // 2) Upsert local en families_meta (overlay).
  const { error } = await supabase
    .from("families_meta")
    .upsert(
      {
        slug: input.slug,
        display_name: input.display_name?.trim() || null,
        description: input.description?.trim() || null,
        sort_order: input.sort_order ?? 0,
        active: input.active ?? true,
      },
      { onConflict: "slug" },
    );
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings/families");
  await revalidatePublicListings();
  revalidatePath("/admin/products");
}

export async function deleteFamilyMeta(slug: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("families_meta").delete().eq("slug", slug);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings/families");
}

// ============================
// MARCAS · gestión sobre product_meta.brand_override
// ============================
export async function renameBrand(fromName: string, toName: string): Promise<number> {
  const { supabase } = await requireAdmin();
  const from = fromName.trim();
  const to = toName.trim();
  if (!from) throw new Error("El nombre origen está vacío.");
  if (!to) throw new Error("El nombre destino está vacío.");
  if (from === to) return 0;

  const { data: rows, error: selErr } = await supabase
    .from("product_meta")
    .select("product_ref, brand_override")
    .ilike("brand_override", from);
  if (selErr) throw new Error(selErr.message);

  const refs = (((rows ?? []) as unknown) as { product_ref: string; brand_override: string | null }[])
    .filter((r) => r.brand_override?.trim().toLowerCase() === from.toLowerCase())
    .map((r) => r.product_ref);

  if (refs.length === 0) return 0;

  const { error: updErr } = await supabase
    .from("product_meta")
    .update({ brand_override: to })
    .in("product_ref", refs);
  if (updErr) throw new Error(updErr.message);

  revalidatePath("/admin/settings/brands");
  revalidatePath("/admin/products");
  await revalidatePublicListings();
  return refs.length;
}

export async function deleteBrand(name: string): Promise<number> {
  const { supabase } = await requireAdmin();
  const target = name.trim();
  if (!target) throw new Error("El nombre está vacío.");

  const { data: rows, error: selErr } = await supabase
    .from("product_meta")
    .select("product_ref, brand_override")
    .ilike("brand_override", target);
  if (selErr) throw new Error(selErr.message);

  const refs = (((rows ?? []) as unknown) as { product_ref: string; brand_override: string | null }[])
    .filter((r) => r.brand_override?.trim().toLowerCase() === target.toLowerCase())
    .map((r) => r.product_ref);

  if (refs.length === 0) return 0;

  const { error: updErr } = await supabase
    .from("product_meta")
    .update({ brand_override: null })
    .in("product_ref", refs);
  if (updErr) throw new Error(updErr.message);

  revalidatePath("/admin/settings/brands");
  revalidatePath("/admin/products");
  await revalidatePublicListings();
  return refs.length;
}

// ============================
// ASIGNACIÓN PRODUCTO ↔ CATÁLOGOS (Supabase, tabla product_catalogs)
// ============================
export async function setProductCatalogs(productRef: string, catalogIds: string[]) {
  const { supabase } = await requireAdmin();

  // Borra todos los actuales y reinserta. Más simple que diff y para volúmenes bajos es suficiente.
  const { error: delErr } = await supabase
    .from("product_catalogs")
    .delete()
    .eq("product_ref", productRef);
  if (delErr) throw new Error(delErr.message);

  if (catalogIds.length > 0) {
    const rows = catalogIds.map((catalog_id) => ({ product_ref: productRef, catalog_id }));
    const { error: insErr } = await supabase.from("product_catalogs").insert(rows);
    if (insErr) throw new Error(insErr.message);
  }

  revalidatePath(`/admin/products/${productRef}`);
  revalidatePath("/admin/products");
}
