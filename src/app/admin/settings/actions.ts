"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/integrations/supabase/server";

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
// CATÁLOGOS
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
// ASIGNACIÓN PRODUCTO ↔ CATÁLOGOS
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
