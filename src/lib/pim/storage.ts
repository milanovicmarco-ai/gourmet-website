"use client";

import { supabase } from "@/integrations/supabase/client";

export const PRODUCT_BUCKET = "product-images";

/**
 * Sube un archivo a Supabase Storage y devuelve la URL pública.
 */
export async function uploadProductImage(productId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeName = file.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-");
  const path = `${productId}/${Date.now()}-${safeName.replace(/\.[^.]+$/, "")}.${ext}`;

  const { error } = await supabase.storage
    .from(PRODUCT_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || `image/${ext}`,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Borra un archivo del bucket de imágenes (solo si la URL es del bucket).
 * Las URLs externas o de /images/ se ignoran sin error.
 */
export async function deleteProductImage(publicUrl: string): Promise<void> {
  const marker = `/storage/v1/object/public/${PRODUCT_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return; // No es del bucket, no la borramos
  const path = publicUrl.slice(idx + marker.length);
  await supabase.storage.from(PRODUCT_BUCKET).remove([path]);
}
