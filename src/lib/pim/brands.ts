// Helper server-only: trae las marcas existentes en /catalog/brands del
// backend del socio para alimentar comboboxes (crear / editar producto).
//
// Si el backend está caído, devuelve lista vacía — el combobox sigue
// permitiendo crear marcas nuevas (que pasarán por ensureBrandExists).

import { AURELLANO_API } from "./api";

export type BrandOption = { slug: string; name: string };

export async function loadBrandOptions(): Promise<BrandOption[]> {
  try {
    const r = await fetch(`${AURELLANO_API}/catalog/brands`, { cache: "no-store" });
    if (!r.ok) return [];
    const data = await r.json();
    const list: { slug?: string; name?: string }[] = Array.isArray(data)
      ? data
      : (data.results ?? []);
    return list
      .map((b) => ({ slug: (b.slug ?? "").trim(), name: (b.name ?? b.slug ?? "").trim() }))
      .filter((b) => b.slug.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.warn("[loadBrandOptions] error:", (err as Error).message);
    return [];
  }
}
