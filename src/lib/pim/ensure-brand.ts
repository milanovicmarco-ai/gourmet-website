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

/** Devuelve la lista actual de brands del backend o array vacío si falla. */
async function listBrands(): Promise<ApiBrand[]> {
  try {
    const res = await fetch(`${AURELLANO_API}/catalog/brands`, {
      headers: { Authorization: `Bearer ${apiKey()}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const raw = await res.json();
    return Array.isArray(raw) ? raw : (raw.results ?? []);
  } catch {
    return [];
  }
}

/** Busca un brand match en la lista (case-insensitive en name + slug). */
function findBrand(brands: ApiBrand[], trimmed: string, slug: string): ApiBrand | undefined {
  const target = trimmed.toLowerCase();
  return brands.find(
    (b) =>
      b.name?.toLowerCase() === target ||
      b.slug?.toLowerCase() === target ||
      b.slug === slug,
  );
}

/**
 * Asegura que la marca exista en /catalog/brands. Si no existe, la crea y
 * VERIFICA con un re-GET que realmente quedó registrada (no nos fiamos del
 * 2xx del POST: hemos visto casos en que el backend responde OK pero la marca
 * no aparece luego en el listado, dejando la FK de products colgando).
 *
 * Devuelve el name canónico que la API acepta o un fallo con razón.
 */
export async function ensureBrandExists(
  name: string | undefined | null,
): Promise<{ ok: true; brand: string } | { ok: false; reason: string }> {
  if (!name || name.trim().length === 0) return { ok: false, reason: "empty" };
  const trimmed = name.trim();
  const slug = slugify(trimmed);

  // 1) Si ya existe en el catálogo, devolvemos su name canónico.
  const initialList = await listBrands();
  const existing = findBrand(initialList, trimmed, slug);
  if (existing) {
    console.log(`[ensureBrandExists] '${trimmed}' YA EXISTE → name="${existing.name}", slug="${existing.slug}"`);
    return { ok: true, brand: existing.name };
  }
  console.log(`[ensureBrandExists] '${trimmed}' NO EXISTE en el listado (${initialList.length} marcas). Intentando crear.`);

  // 2) Probar varias shapes para crear. No conocemos el contrato exacto de FastAPI.
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
        // ¡OJO! 2xx no garantiza que el brand esté usable como FK en /catalog/products.
        // Verificamos con un re-GET que la marca aparezca realmente listada.
        const verifyList = await listBrands();
        const verified = findBrand(verifyList, trimmed, slug);
        if (verified) {
          console.log(`[ensureBrandExists] '${trimmed}' creado y VERIFICADO → name="${verified.name}"`);
          return { ok: true, brand: verified.name };
        }
        console.warn(
          `[ensureBrandExists] POST devolvió 2xx para '${trimmed}' pero el re-GET NO la encuentra. Probando siguiente shape.`,
        );
        lastReason = `POST 2xx pero verify-GET no encuentra '${trimmed}' (shape: ${JSON.stringify(bodyCreate)})`;
        continue;
      }
      const body = await createRes.text().catch(() => "");
      lastReason = `POST /brands ${createRes.status}: ${body.slice(0, 200)}`;
      console.warn(`[ensureBrandExists] shape rechazada (${createRes.status}): ${body.slice(0, 200)}`);
      // 409 → ya existe (carrera con otro POST). Re-buscamos.
      if (createRes.status === 409) {
        const retryList = await listBrands();
        const match = findBrand(retryList, trimmed, slug);
        if (match) return { ok: true, brand: match.name };
      }
    } catch (err) {
      lastReason = (err as Error).message;
      console.warn(`[ensureBrandExists] error de red: ${lastReason}`);
    }
  }
  console.error(`[ensureBrandExists] '${trimmed}' NO se pudo asegurar tras probar todas las shapes. Último motivo: ${lastReason}`);
  return { ok: false, reason: lastReason || "todas las shapes rechazadas" };
}
