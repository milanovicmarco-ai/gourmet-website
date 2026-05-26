// Helper server-only: asegura que una marca existe en /catalog/brands del
// backend del socio antes de referenciarla en un POST/PUT de producto.
//
// La API tiene FK estricta a la tabla `brands`, así que NO se pueden referenciar
// marcas que no estén creadas. Si no existe, intentamos crearla (probando varias
// "shapes" porque no conocemos el contrato exacto de FastAPI).
//
// Se usa desde:
//   - src/app/admin/products/actions.ts (flujo single product, retry placeholder)
//   - src/app/admin/products/bulk/actions.ts (flujo bulk, cuando se publica)

import { AURELLANO_API } from "./api";

type ApiBrand = {
  id?: string;
  slug?: string;
  name: string;
  story?: string | null;
  origin?: string | null;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function apiKey() {
  const k = process.env.ADMIN_API_KEY;
  if (!k) throw new Error("Falta ADMIN_API_KEY en el entorno (server-only).");
  return k;
}

/**
 * Asegura que la marca exista en /catalog/brands. Si no existe, la crea.
 * Devuelve el nombre canónico que la API acepta o un fallo descriptivo.
 */
export async function ensureBrandExists(
  name: string | undefined | null,
): Promise<{ ok: true; brand: string } | { ok: false; reason: string }> {
  if (!name || name.trim().length === 0) return { ok: false, reason: "empty" };
  const trimmed = name.trim();
  const slug = slugify(trimmed);

  // 1) Buscar entre las brands existentes
  try {
    const listRes = await fetch(`${AURELLANO_API}/catalog/brands`, {
      headers: { Authorization: `Bearer ${apiKey()}` },
      cache: "no-store",
    });
    if (listRes.ok) {
      const list: ApiBrand[] | { results?: ApiBrand[] } = await listRes.json();
      const brands: ApiBrand[] = Array.isArray(list) ? list : list.results ?? [];
      const target = trimmed.toLowerCase();
      const match = brands.find(
        (b) =>
          b.name?.toLowerCase() === target ||
          b.slug?.toLowerCase() === target ||
          b.slug === slug,
      );
      if (match) {
        return { ok: true, brand: match.name };
      }
    }
  } catch (err) {
    console.warn(`[ensureBrandExists] GET error: ${(err as Error).message}`);
  }

  // 2) Intentar crear con varias shapes porque no conocemos el contrato exacto.
  const shapes = [
    { slug, name: trimmed, story: null, origin: null, sort_order: 0, active: true },
    { slug, name: trimmed, active: true },
    { name: trimmed, slug },
    { name: trimmed },
  ];
  let lastReason = "";
  for (const bodyCreate of shapes) {
    try {
      const createRes = await fetch(`${AURELLANO_API}/catalog/brands`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey()}`,
        },
        body: JSON.stringify(bodyCreate),
      });
      if (createRes.ok) {
        const created = (await createRes.json()) as ApiBrand;
        return { ok: true, brand: created.name ?? trimmed };
      }
      const body = await createRes.text().catch(() => "");
      lastReason = `POST /brands ${createRes.status}: ${body.slice(0, 200)}`;
      // 409 → ya existe (carrera con otro POST). Re-buscamos.
      if (createRes.status === 409) {
        const retryList = await fetch(`${AURELLANO_API}/catalog/brands`, {
          headers: { Authorization: `Bearer ${apiKey()}` },
          cache: "no-store",
        });
        if (retryList.ok) {
          const list = await retryList.json();
          const brands: ApiBrand[] = Array.isArray(list) ? list : list.results ?? [];
          const match = brands.find(
            (b) =>
              b.name?.toLowerCase() === trimmed.toLowerCase() ||
              b.slug === slug,
          );
          if (match) return { ok: true, brand: match.name };
        }
      }
    } catch (err) {
      lastReason = (err as Error).message;
    }
  }
  return { ok: false, reason: lastReason || "todas las shapes rechazadas" };
}
