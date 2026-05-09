"use server";

// Server Actions para el admin del PIM.
// Aquí (y SÓLO aquí) vive la ADMIN_API_KEY. Nunca se exponen estas funciones al
// cliente directamente; los formularios "use client" las invocan via React server actions.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/integrations/supabase/server";
import { mapToApi, type FormFields } from "@/lib/pim/api-mapper";
import { AURELLANO_API } from "@/lib/pim/api";

const apiKey = () => {
  const k = process.env.ADMIN_API_KEY;
  if (!k) throw new Error("Falta ADMIN_API_KEY en el entorno (server-only).");
  return k;
};

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

async function jsonOr(error: string, res: Response) {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${error} (${res.status}): ${body}`);
  }
  return res.json();
}

// =============================================================
// Crear producto
// =============================================================
export async function createProduct(form: FormFields & { ref?: string }) {
  await requireAdmin();
  const payload = { ref: form.ref, ...mapToApi(form) };
  const res = await fetch(`${AURELLANO_API}/catalog/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await jsonOr("createProduct", res);
  revalidatePath("/admin/products");
  return data;
}

export async function createProductAndRedirect(form: FormFields & { ref?: string }) {
  const data = await createProduct(form);
  redirect(`/admin/products/${data.ref}`);
}

// =============================================================
// Actualizar producto
// =============================================================
export async function updateProduct(ref: string, form: FormFields) {
  await requireAdmin();
  const res = await fetch(`${AURELLANO_API}/catalog/products/${encodeURIComponent(ref)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify(mapToApi(form)),
  });
  const data = await jsonOr("updateProduct", res);
  revalidatePath(`/admin/products/${ref}`);
  revalidatePath(`/admin/products`);
  if (data.slug) revalidatePath(`/producto/${data.slug}`);
  return data;
}

// =============================================================
// Borrar producto (soft por defecto)
// =============================================================
export async function deleteProduct(ref: string, hard = false) {
  await requireAdmin();
  const url = hard
    ? `${AURELLANO_API}/catalog/products/${encodeURIComponent(ref)}?hard=true&confirm_ref=${encodeURIComponent(ref)}`
    : `${AURELLANO_API}/catalog/products/${encodeURIComponent(ref)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey()}` },
  });
  const data = await jsonOr("deleteProduct", res);
  revalidatePath("/admin/products");
  return data;
}

// =============================================================
// Subir imagen del producto (multipart → Cloudinary)
// =============================================================
export async function uploadProductImage(ref: string, formData: FormData) {
  await requireAdmin();
  const res = await fetch(
    `${AURELLANO_API}/catalog/products/${encodeURIComponent(ref)}/image`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}` },
      body: formData,
    },
  );
  const data = await jsonOr("uploadProductImage", res);
  revalidatePath(`/admin/products/${ref}`);
  revalidatePath(`/admin/products`);
  return data;
}
