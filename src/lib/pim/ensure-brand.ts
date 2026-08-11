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
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const raw = await res.json();
    return Array.isArray(raw) ? raw : (raw.results ?? []);
  } catch {
    return [];
  }
}

/** Resultado canónico cuando una marca se asegura: name y slug. La FK de la
 *  tabla `products` del socio puede usar el name O el slug — el caller decide
 *  cuál enviar primero (y reintentar con el otro si falla). */
export type EnsureBrandOk = { ok: true; brand: string; slug: string };
export type EnsureBrandFail = { ok: false; reason: string };
export type EnsureBrandResult = EnsureBrandOk | EnsureBrandFail;

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

/** Extrae el slug canónico del ApiBrand devuelto por el backend, o lo
 *  recalcula si la respuesta no lo trae. */
function brandSlug(b: ApiBrand, fallback: string): string {
  return (b.slug && b.slug.trim().length > 0 ? b.slug : fallback).trim();
}

/**
 * Asegura que la marca exista en /catalog/brands. Si no existe, la crea y
 * VERIFICA con un re-GET que realmente quedó registrada (no nos fiamos del
 * 2xx del POST: hemos visto casos en que el backend responde OK pero la marca
 * no aparece luego en el listado, dejando la FK de products colgando).
 *
 * Devuelve { brand: name, slug } para que el caller pueda probar primero con
 * el name y, si la FK del endpoint /catalog/products es por slug, reintentar.
 */
export async function ensureBrandExists(
  name: string | undefined | null,
): Promise<EnsureBrandResult> {
  if (!name || name.trim().length === 0) return { ok: false, reason: "empty" };
  const trimmed = name.trim();
  const slug = slugify(trimmed);

  // 1) Si ya existe en el catálogo, devolvemos su name + slug canónicos.
  const initialList = await listBrands();
  const existing = findBrand(initialList, trimmed, slug);
  if (existing) {
    const existingSlug = brandSlug(existing, slug);
    console.log(`[ensureBrandExists] '${trimmed}' YA EXISTE → name="${existing.name}", slug="${existingSlug}"`);
    return { ok: true, brand: existing.name, slug: existingSlug };
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
        // Si la API responde con el cuerpo del brand creado, lo usamos como
        // fuente de verdad. Si no, intentamos verificar con un re-GET (para
        // obtener el slug canónico si la API lo asigna distinto del nuestro),
        // pero NO fallamos la creación si el verify no encuentra — la API
        // podría tener paginación, latencia de índice u otra cosa.
        try {
          const created = (await createRes.clone().json()) as ApiBrand;
          if (created && (created.name || created.slug)) {
            const finalName = created.name || trimmed;
            const finalSlug = created.slug || slug;
            console.log(`[ensureBrandExists] '${trimmed}' creado (POST 2xx) → name="${finalName}", slug="${finalSlug}"`);
            return { ok: true, brand: finalName, slug: finalSlug };
          }
        } catch {
          // body sin JSON parseable — caemos al verify-GET o trust-input
        }
        // Verify "best effort": si encontramos el brand recién creado, devolvemos
        // su nombre/slug canónicos. Si no, confiamos en el 2xx y devolvemos el input.
        const verifyList = await listBrands();
        const verified = findBrand(verifyList, trimmed, slug);
        if (verified) {
          const verifiedSlug = brandSlug(verified, slug);
          console.log(`[ensureBrandExists] '${trimmed}' creado y VERIFICADO → name="${verified.name}", slug="${verifiedSlug}"`);
          return { ok: true, brand: verified.name, slug: verifiedSlug };
        }
        console.warn(
          `[ensureBrandExists] POST 2xx para '${trimmed}' pero el re-GET NO la encuentra (¿paginación o latencia?). Confiamos en el 2xx.`,
        );
        return { ok: true, brand: trimmed, slug };
      }
      const body = await createRes.text().catch(() => "");
      lastReason = `POST /brands ${createRes.status}: ${body.slice(0, 200)}`;
      console.warn(`[ensureBrandExists] shape rechazada (${createRes.status}): ${body.slice(0, 200)}`);
      // 409 → ya existe (carrera con otro POST). Re-buscamos.
      if (createRes.status === 409) {
        const retryList = await listBrands();
        const match = findBrand(retryList, trimmed, slug);
        if (match) return { ok: true, brand: match.name, slug: brandSlug(match, slug) };
      }
    } catch (err) {
      lastReason = (err as Error).message;
      console.warn(`[ensureBrandExists] error de red: ${lastReason}`);
    }
  }
  console.error(`[ensureBrandExists] '${trimmed}' NO se pudo asegurar tras probar todas las shapes. Último motivo: ${lastReason}`);
  return { ok: false, reason: lastReason || "todas las shapes rechazadas" };
}
