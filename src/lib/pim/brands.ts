// Helper server-only: trae las marcas existentes en /catalog/brands del
// backend del socio para alimentar comboboxes (crear / editar producto).
//
// Si el backend está caído o tarda demasiado, devuelve lista vacía — el
// combobox sigue permitiendo crear marcas nuevas (que pasarán por
// ensureBrandExists). MUY IMPORTANTE: timeout duro de 5s vía
// AbortController. Sin esto, si el backend cuelga la página entera de
// edición de producto se queda esperando indefinidamente (todas las
// llamadas van en Promise.all en el Server Component).

import { AURELLANO_API } from "./api";

export type BrandOption = { slug: string; name: string };

const BRANDS_TIMEOUT_MS = 5_000;

export async function loadBrandOptions(): Promise<BrandOption[]> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), BRANDS_TIMEOUT_MS);
  try {
    const r = await fetch(`${AURELLANO_API}/catalog/brands`, {
      // Cache 1h en el edge de Vercel. Si Marco crea una marca nueva en el
      // editor, ensureBrandExists ya garantiza que existe antes de guardar,
      // así que el combobox un poco stale no rompe nada.
      next: { revalidate: 3600 },
      signal: controller.signal,
    });
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
    console.warn("[loadBrandOptions] error o timeout:", (err as Error).message);
    return [];
  } finally {
    clearTimeout(id);
  }
}
