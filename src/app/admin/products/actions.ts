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
  // En dev se puede saltar el gate Supabase con DEV_BYPASS_ADMIN_AUTH=1.
  // Devuelve un mock user mínimo para no romper consumers que usan user.email.
  if (process.env.DEV_BYPASS_ADMIN_AUTH === "1") {
    return { id: "dev-bypass", email: "dev@local" } as const;
  }
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

// =============================================================
// Galería multi-imagen
// =============================================================

/** Añade una imagen a la galería (al final del array). Dedup por hash MD5. */
export async function addProductImage(ref: string, formData: FormData) {
  await requireAdmin();
  const res = await fetch(
    `${AURELLANO_API}/catalog/products/${encodeURIComponent(ref)}/images`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey()}` },
      body: formData,
    },
  );
  const data = await jsonOr("addProductImage", res);
  revalidatePath(`/admin/products/${ref}`);
  revalidatePath(`/admin/products`);
  return data as { ref: string; image_url: string | null; gallery: string[]; optimization_score: number | null; deduplicated?: boolean };
}

/** Quita una imagen concreta de la galería + intenta borrarla de Cloudinary. */
export async function removeProductImage(ref: string, url: string) {
  await requireAdmin();
  const qs = new URLSearchParams({ url });
  const res = await fetch(
    `${AURELLANO_API}/catalog/products/${encodeURIComponent(ref)}/images?${qs.toString()}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey()}` },
    },
  );
  const data = await jsonOr("removeProductImage", res);
  revalidatePath(`/admin/products/${ref}`);
  revalidatePath(`/admin/products`);
  return data as { ref: string; image_url: string | null; gallery: string[]; optimization_score: number | null };
}

// =============================================================
// Brands & Families (crear al vuelo desde el combobox del admin)
// =============================================================

/** Crea una marca nueva. Slug auto-generado desde name. */
export async function createBrand(name: string) {
  await requireAdmin();
  const res = await fetch(`${AURELLANO_API}/catalog/brands`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({ name: name.trim() }),
  });
  if (res.status === 409) {
    throw new Error(`Esa marca ya existe. Búscala en la lista en lugar de crearla.`);
  }
  const data = await jsonOr("createBrand", res);
  revalidatePath("/admin/products");
  return data as { slug: string; name: string };
}

/** Crea una familia nueva. Slug en MAYÚSCULAS. */
export async function createFamily(slug: string, name: string) {
  await requireAdmin();
  const res = await fetch(`${AURELLANO_API}/catalog/families`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({ slug: slug.toUpperCase().trim(), name: name.trim() }),
  });
  if (res.status === 409) {
    throw new Error(`Esa familia ya existe. Búscala en la lista en lugar de crearla.`);
  }
  const data = await jsonOr("createFamily", res);
  revalidatePath("/admin/products");
  return data as { slug: string; name: string };
}

/** Reordena la galería. `order` debe ser una permutación exacta de la galería actual. */
export async function reorderProductImages(ref: string, order: string[]) {
  await requireAdmin();
  const res = await fetch(
    `${AURELLANO_API}/catalog/products/${encodeURIComponent(ref)}/images/order`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey()}`,
      },
      body: JSON.stringify({ order }),
    },
  );
  const data = await jsonOr("reorderProductImages", res);
  revalidatePath(`/admin/products/${ref}`);
  revalidatePath(`/admin/products`);
  return data as { ref: string; image_url: string | null; gallery: string[]; optimization_score: number | null };
}
