// Helpers puros de marca y búsqueda del catálogo.
// Sin dependencias de servidor (Supabase/Next) para poder testearlos aislados.

/** Marca técnica que la API del socio exige por su FK cuando un producto se
 *  publica desde el PIM. NO es una marca pública: la marca real vive en
 *  product_meta.brand_override. Nunca debe mostrarse como marca en la web. */
export const SENTINEL_BRAND = "aurellano";

/** La marca visible al público:
 *  - brand_override del overlay si existe (gana siempre, incluso "Aurellano"),
 *  - si no, la de la API del socio,
 *  - salvo que esa sea el sentinel técnico → el producto va "sin marca" ("").
 */
export function effectiveBrand(
  meta: { brand_override?: string | null } | null | undefined,
  apiBrand: string | null | undefined,
): string {
  const bo = meta?.brand_override?.trim();
  if (bo && bo.length > 0) return bo;
  const api = apiBrand?.trim();
  if (!api || api.toLowerCase() === SENTINEL_BRAND) return "";
  return api;
}

/** Búsqueda de texto libre tolerante: parte la consulta en términos y exige que
 *  TODOS aparezcan (en cualquier orden) en el texto combinado de los campos.
 *  Permite buscar en memoria por nombre, marca REAL (overlay), referencia, etc.
 *  — cosa que la API del socio no puede hacer porque no conoce las marcas. */
export function matchesSearch(
  haystacks: Array<string | null | undefined>,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  // Separador improbable entre campos para no crear coincidencias cruzadas.
  const hay = haystacks.filter(Boolean).join("  ").toLowerCase();
  return q.split(/\s+/).filter(Boolean).every((term) => hay.includes(term));
}
