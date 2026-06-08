"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/integrations/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return supabase;
}

// Los archivos (PDF, carátula, logo) se suben en el NAVEGADOR directamente a
// Supabase Storage (ver inspiration-manager.tsx). A estas Server Actions solo
// llegan las URLs públicas resultantes como texto. Así el archivo pesado nunca
// pasa por Vercel, evitando el límite de 4.5 MB del cuerpo de las Server Actions.

/** Crea un catálogo de inspiración a partir de las URLs ya subidas. */
export async function createInspirationCatalog(formData: FormData) {
  const supabase = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const sort_order = Number(String(formData.get("sort_order") ?? "0")) || 0;
  const active = formData.get("active") === "1";
  const pdf_url = String(formData.get("pdf_url") ?? "").trim();
  const cover_url = String(formData.get("cover_url") ?? "").trim();
  const logo_url = String(formData.get("logo_url") ?? "").trim() || null;

  if (!title) throw new Error("Falta título.");
  if (!pdf_url) throw new Error("Falta el PDF.");
  if (!cover_url) throw new Error("Falta la carátula.");

  const { error } = await supabase.from("inspiration_catalogs").insert({
    title,
    pdf_url,
    cover_url,
    logo_url,
    sort_order,
    active,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings/inspiration");
  revalidatePath("/inspiracion");
}

/** Actualiza meta (título, orden, activo). Si llegan URLs nuevas de PDF/cover/logo,
 *  reemplaza el campo correspondiente. */
export async function updateInspirationCatalog(id: string, formData: FormData) {
  const supabase = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const sort_order = Number(String(formData.get("sort_order") ?? "0")) || 0;
  const active = formData.get("active") === "1";
  if (!title) throw new Error("Falta título.");

  const pdf_url = String(formData.get("pdf_url") ?? "").trim();
  const cover_url = String(formData.get("cover_url") ?? "").trim();
  const logo_url = String(formData.get("logo_url") ?? "").trim();

  const patch: Record<string, unknown> = { title, sort_order, active };
  if (pdf_url) patch.pdf_url = pdf_url;
  if (cover_url) patch.cover_url = cover_url;
  if (logo_url) patch.logo_url = logo_url;

  const { error } = await supabase
    .from("inspiration_catalogs")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings/inspiration");
  revalidatePath("/inspiracion");
}

export async function deleteInspirationCatalog(id: string) {
  const supabase = await requireAdmin();
  // No borramos los archivos del bucket — orphans son aceptables y evita rotura
  // si se compartió un link. Limpieza periódica fuera de scope.
  const { error } = await supabase.from("inspiration_catalogs").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings/inspiration");
  revalidatePath("/inspiracion");
}

export async function toggleInspirationCatalogActive(id: string, active: boolean) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("inspiration_catalogs")
    .update({ active })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings/inspiration");
  revalidatePath("/inspiracion");
}
