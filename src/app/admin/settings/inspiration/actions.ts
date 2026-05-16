"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/integrations/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return supabase;
}

const BUCKET = "inspiration";

const sanitizeFilename = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

/**
 * Sube un archivo al bucket de Inspiración. Devuelve la URL pública.
 * Path = "{folder}/{timestamp}-{filename-saneado}".
 */
async function uploadToBucket(
  file: File,
  folder: "pdfs" | "covers" | "logos",
): Promise<string> {
  const supabase = await requireAdmin();
  const ts = Date.now();
  const safeName = sanitizeFilename(file.name) || `file-${ts}`;
  const path = `${folder}/${ts}-${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type || undefined,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`storage.upload ${path}: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error(`No se pudo generar URL pública para ${path}`);
  return data.publicUrl;
}

/** Crea un nuevo catálogo de inspiración desde un FormData multipart. */
export async function createInspirationCatalog(formData: FormData) {
  const supabase = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const sortOrderRaw = String(formData.get("sort_order") ?? "0");
  const sort_order = Number(sortOrderRaw) || 0;
  const active = formData.get("active") === "1";

  if (!title) throw new Error("Falta título.");

  const pdf = formData.get("pdf");
  const cover = formData.get("cover");
  const logo = formData.get("logo");

  if (!(pdf instanceof File) || pdf.size === 0) throw new Error("Falta el PDF.");
  if (!(cover instanceof File) || cover.size === 0) throw new Error("Falta la carátula.");
  if (pdf.type && !pdf.type.includes("pdf")) {
    throw new Error("El archivo PDF debe ser un .pdf");
  }

  const [pdfUrl, coverUrl, logoUrl] = await Promise.all([
    uploadToBucket(pdf, "pdfs"),
    uploadToBucket(cover, "covers"),
    logo instanceof File && logo.size > 0 ? uploadToBucket(logo, "logos") : Promise.resolve(null),
  ]);

  const { error } = await supabase.from("inspiration_catalogs").insert({
    title,
    pdf_url: pdfUrl,
    cover_url: coverUrl,
    logo_url: logoUrl,
    sort_order,
    active,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings/inspiration");
  revalidatePath("/inspiracion");
}

/** Actualiza meta (título, orden, activo). Si se sube un nuevo PDF/cover/logo,
 *  reemplaza el campo correspondiente. */
export async function updateInspirationCatalog(id: string, formData: FormData) {
  const supabase = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const sortOrderRaw = String(formData.get("sort_order") ?? "0");
  const sort_order = Number(sortOrderRaw) || 0;
  const active = formData.get("active") === "1";
  if (!title) throw new Error("Falta título.");

  const pdf = formData.get("pdf");
  const cover = formData.get("cover");
  const logo = formData.get("logo");

  const patch: Record<string, unknown> = { title, sort_order, active };

  if (pdf instanceof File && pdf.size > 0) {
    patch.pdf_url = await uploadToBucket(pdf, "pdfs");
  }
  if (cover instanceof File && cover.size > 0) {
    patch.cover_url = await uploadToBucket(cover, "covers");
  }
  if (logo instanceof File && logo.size > 0) {
    patch.logo_url = await uploadToBucket(logo, "logos");
  }

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
