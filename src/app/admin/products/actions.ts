"use server";

// Server Actions para el admin del PIM.
// Aquí (y SÓLO aquí) vive la ADMIN_API_KEY. Nunca se exponen estas funciones al
// cliente directamente; los formularios "use client" las invocan via React server actions.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/integrations/supabase/server";
import { mapToApi, type FormFields } from "@/lib/pim/api-mapper";
import { AURELLANO_API } from "@/lib/pim/api";
import { ensureBrandExists } from "@/lib/pim/ensure-brand";
import { revalidatePublicAll, revalidatePublicListings } from "@/lib/pim/revalidate-public";

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
    let body = "";
    try {
      // Intenta parsear como JSON (FastAPI suele devolver {detail:...} u object con campos);
      // si falla, cae a texto plano.
      const cloned = res.clone();
      const asJson = await cloned.json().catch(() => null);
      if (asJson) {
        body = typeof asJson === "string" ? asJson : JSON.stringify(asJson);
      } else {
        body = await res.text();
      }
    } catch {
      body = await res.text().catch(() => "");
    }
    const msg = body && body.length > 0 ? body.slice(0, 600) : res.statusText;
    // Log server-side para que aparezca en `npm run dev` aunque la UI sólo enseñe el resumen.
    console.error(`[${error}] ${res.status} ${res.url}\n${msg}`);
    throw new Error(`${error} (${res.status}): ${msg}`);
  }
  return res.json();
}

// =============================================================
// Crear producto
// =============================================================
export async function createProduct(form: FormFields & { ref?: string }) {
  await requireAdmin();
  const payload: Record<string, unknown> = { ref: form.ref, ...mapToApi(form) };

  // Pre-check familia: si la familia del form no existe en la API del socio,
  // la creamos antes (mismo patrón que ensureBrandExists).
  if (typeof payload.family === "string" && payload.family.trim().length > 0) {
    const check = await ensureFamilyExists(payload.family);
    if (check.ok === true) {
      payload.family = check.family;
    } else {
      console.warn(
        `[createProduct] no se pudo asegurar familia "${payload.family}" (${check.reason}). El POST probablemente fallará — surfacing al usuario.`,
      );
    }
  }

  // Política Marco: solo nombre, ref e imagen son obligatorios. Si se publica
  // directamente, rellenamos el resto con placeholders antes del POST.
  if (payload.status === "published") {
    await enrichForPublish(payload, form.brand);
  }

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
// Helpers de familias — auto-crea si no existe en la API del socio
// =============================================================
// ensureBrandExists vive ahora en @/lib/pim/ensure-brand para compartirlo con
// el bulk import.
//
// Mismo patrón que ensureBrandExists: la API del socio tiene FK estricta a su
// tabla `families`, así que si Marco crea una familia en nuestro overlay
// (families_meta de Supabase) y la asigna a un producto, hay que crearla
// también en su backend antes del PUT/POST del producto.

type ApiFamily = {
  id?: string;
  slug?: string;
  name?: string;
  family?: string;
};

const FAMILY_SLUG = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");

/**
 * Asegura que la familia exista en /catalog/families. Si no existe, intenta
 * crearla. Acepta slug arbitrario (ej. "PLATOS_PREPARADOS") y opcionalmente un
 * display name.
 */
export async function ensureFamilyExists(
  slug: string | undefined,
  displayName?: string | null,
): Promise<{ ok: true; family: string } | { ok: false; reason: string }> {
  if (!slug || slug.trim().length === 0) return { ok: false, reason: "empty" };
  const canonical = FAMILY_SLUG(slug);
  const display = displayName?.trim() || canonical;

  // 1) Buscar entre las familias existentes
  try {
    const listRes = await fetch(`${AURELLANO_API}/catalog/families`, {
      headers: { Authorization: `Bearer ${apiKey()}` },
      cache: "no-store",
    });
    if (listRes.ok) {
      const raw = await listRes.json();
      const families: ApiFamily[] = Array.isArray(raw) ? raw : raw.results ?? [];
      const target = canonical.toLowerCase();
      const match = families.find((f) => {
        const id = (f.slug || f.family || f.name || "").toString();
        return id.toLowerCase() === target || id === canonical;
      });
      if (match) {
        const found = (match.slug || match.family || match.name || canonical).toString();
        console.log(`[ensureFamilyExists] match existente:`, found);
        return { ok: true, family: found };
      }
      console.log(`[ensureFamilyExists] no hay match para '${canonical}', intentando crear`);
    } else {
      const body = await listRes.text().catch(() => "");
      console.warn(`[ensureFamilyExists] GET /catalog/families falló (${listRes.status}): ${body.slice(0, 200)}`);
    }
  } catch (err) {
    console.warn(`[ensureFamilyExists] GET error: ${(err as Error).message}`);
  }

  // 2) Intentar crear (varias shapes como hacemos con brands).
  const shapes = [
    { slug: canonical, name: display, family: canonical, active: true, sort_order: 0 },
    { slug: canonical, name: display, active: true },
    { family: canonical, name: display, active: true },
    { slug: canonical, name: display },
    { family: canonical, name: display },
    { name: display, slug: canonical },
    { name: display },
  ];
  let lastReason = "";
  for (const bodyCreate of shapes) {
    try {
      console.log(`[ensureFamilyExists] POST /catalog/families probando shape:`, JSON.stringify(bodyCreate));
      const createRes = await fetch(`${AURELLANO_API}/catalog/families`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey()}`,
        },
        body: JSON.stringify(bodyCreate),
      });
      if (createRes.ok) {
        const created = (await createRes.json()) as ApiFamily;
        const name = (created.slug || created.family || created.name || canonical).toString();
        console.log(`[ensureFamilyExists] creada OK:`, name);
        return { ok: true, family: name };
      }
      const body = await createRes.text().catch(() => "");
      lastReason = `POST /families ${createRes.status}: ${body.slice(0, 200)}`;
      console.warn(`[ensureFamilyExists] shape rechazada (${createRes.status}): ${body.slice(0, 200)}`);
      // 409 conflict → ya existe (carrera con otro POST). Considera ok.
      if (createRes.status === 409) {
        return { ok: true, family: canonical };
      }
    } catch (err) {
      lastReason = (err as Error).message;
      console.warn(`[ensureFamilyExists] POST error: ${lastReason}`);
    }
  }
  return { ok: false, reason: lastReason || "todas las shapes rechazadas" };
}

// =============================================================
// Actualizar producto — con auto-create de marca/familia + retry si falla
// =============================================================
async function doProductPut(ref: string, payload: Record<string, unknown>) {
  console.log(`[updateProduct] PUT ${ref} payload:`, JSON.stringify(payload));
  const res = await fetch(`${AURELLANO_API}/catalog/products/${encodeURIComponent(ref)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify(payload),
  });
  return res;
}

export type UpdateProductResult = {
  product: Record<string, unknown>;
  /** Campos que rellenamos automáticamente con placeholders para poder publicar. */
  autoFilledFields?: string[];
  /** Slug nuevo si cambió (para que el front pueda navegar al nuevo URL). */
  newSlug?: string;
};

/** Extrae el detail textual del cuerpo de error de la API (FastAPI). */
async function readErrorDetail(res: Response): Promise<string> {
  try {
    const cloned = res.clone();
    const asJson = await cloned.json().catch(() => null);
    if (asJson && typeof asJson === "object") {
      const detail = (asJson as { detail?: unknown }).detail;
      if (typeof detail === "string") return detail;
      return JSON.stringify(asJson);
    }
    return await res.text();
  } catch {
    return await res.text().catch(() => "");
  }
}

/**
 * Política del PIM: NO hay campos obligatorios desde nuestro lado. La API del
 * socio tiene reglas de negocio (p.ej. "para publicar necesitas marca + alérgenos")
 * que NO queremos imponer al editor. Por eso, si la API rechaza el publish con
 * 400 "Faltan campos obligatorios: X, Y, ...", rellenamos esos campos con
 * placeholders neutros y reintentamos. El editor nunca debería ver un guardado
 * "fallido" por reglas del backend.
 */
/** Normaliza para comparar: minúsculas, sin acentos, sin espacios extra.
 * Crítico: "alérgenos" → "alergenos" para que los regex sin acento matcheen. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/**
 * Política de Marco: los ÚNICOS campos obligatorios al publicar son
 * nombre, ref e imagen. Esta función rellena PROACTIVAMENTE el resto de
 * campos que el publish-gate del socio exige (marca, familia, alérgenos,
 * origen, descripción corta, ingredientes) con placeholders neutros si
 * el usuario los dejó vacíos.
 *
 * Solo rellena los que estén VACÍOS — no pisa nada que el usuario haya escrito.
 * La imagen NO se puede rellenar con texto: si el producto no tiene image_url
 * en el payload ni en la BD, el publish fallará y habrá que subirla a mano.
 */
async function enrichForPublish(
  payload: Record<string, unknown>,
  userBrand?: string | null,
): Promise<string[]> {
  const filled: string[] = [];

  // Marca con FK estricta → ensureBrandExists con sentinel "Aurellano".
  // OJO: mapToApi NUNCA envía brand a la API (vive en overlay Supabase),
  // así que payload.brand SIEMPRE es undefined aquí. Solo reportamos "marca"
  // como auto-filled si el usuario tampoco había puesto una marca en su form,
  // para no confundirlo (el placeholder "Aurellano" es solo para FK del socio).
  const currentBrand = payload.brand;
  if (
    currentBrand == null ||
    (typeof currentBrand === "string" && currentBrand.trim().length === 0)
  ) {
    const ensure = await ensureBrandExists("Aurellano").catch(() => null);
    if (ensure && ensure.ok) {
      payload.brand = ensure.brand;
      const userHasBrand = userBrand && userBrand.trim().length > 0;
      if (!userHasBrand) filled.push("marca");
    }
  }

  // Familia con FK estricta → ensureFamilyExists con sentinel "VARIOS".
  const currentFamily = payload.family;
  if (
    currentFamily == null ||
    (typeof currentFamily === "string" && currentFamily.trim().length === 0)
  ) {
    const ensure = await ensureFamilyExists("VARIOS").catch(() => null);
    if (ensure && ensure.ok) {
      payload.family = ensure.family;
      filled.push("familia");
    }
  }

  // Campos de texto libre: placeholders neutros si están vacíos.
  const setIfEmpty = (key: string, value: string, label: string) => {
    const v = payload[key];
    if (v == null || (typeof v === "string" && v.trim().length === 0)) {
      payload[key] = value;
      filled.push(label);
    }
  };
  setIfEmpty("alergenos", "Consultar etiqueta", "alérgenos");
  setIfEmpty("origen", "—", "origen");
  setIfEmpty("descripcion_corta", "—", "descripción corta");
  setIfEmpty("ingredientes", "Consultar etiqueta", "ingredientes");

  return filled;
}

function placeholderFor(field: string): { key: string; value: unknown } | null {
  const f = normalize(field);
  // Brand: sentinel "Aurellano" — se crea (si no existe) vía ensureBrandExists en el retry,
  // así pasa la FK estricta. La marca visible al público sale de product_meta.brand_override.
  if (/marca|brand/.test(f)) return { key: "brand", value: "Aurellano" };
  if (/aler/.test(f)) return { key: "alergenos", value: "Consultar etiqueta" };
  if (/origen|origin/.test(f)) return { key: "origen", value: "—" };
  if (/famil|categor/.test(f)) return { key: "family", value: "VARIOS" };
  if (/descr.*cort/.test(f) || /short.*desc/.test(f)) return { key: "descripcion_corta", value: "—" };
  if (/ingredient/.test(f)) return { key: "ingredientes", value: "Consultar etiqueta" };
  if (/nombre|^name$/.test(f)) return { key: "name", value: "Producto sin nombre" };
  return null;
}

// =============================================================
// Helpers públicos: crear marca / familia desde el combobox del editor.
// Devuelven { slug, name } como espera entity-combobox.tsx.
// =============================================================

export async function createBrand(name: string): Promise<{ slug: string; name: string }> {
  await requireAdmin();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("El nombre de la marca está vacío.");
  const check = await ensureBrandExists(trimmed);
  if (check.ok !== true) {
    throw new Error(`No se pudo crear la marca: ${check.reason}`);
  }
  // ensureBrandExists devuelve `brand` con el name canónico; el slug lo derivamos.
  const slug = check.brand
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return { slug, name: check.brand };
}

export async function createFamily(
  slug: string,
  displayName: string,
): Promise<{ slug: string; name: string }> {
  await requireAdmin();
  const trimmedSlug = slug.trim();
  const trimmedName = displayName.trim();
  if (!trimmedSlug) throw new Error("El slug de la familia está vacío.");
  const check = await ensureFamilyExists(trimmedSlug, trimmedName);
  if (check.ok !== true) {
    throw new Error(`No se pudo crear la familia: ${check.reason}`);
  }
  return { slug: check.family, name: trimmedName || check.family };
}

export async function updateProduct(
  ref: string,
  form: FormFields,
): Promise<UpdateProductResult> {
  await requireAdmin();
  // mapToApi NO envía brand a la API: la marca real vive en product_meta.brand_override
  // (Supabase) gestionada por saveProductMeta y se aplica como overlay en la web pública.
  const payload = mapToApi(form);

  // Pre-check familia: si la familia no existe en la API del socio, la creamos.
  // Evita el 400 "La familia X no existe en la tabla de familias".
  if (typeof payload.family === "string" && payload.family.trim().length > 0) {
    const check = await ensureFamilyExists(payload.family);
    if (check.ok === true) {
      payload.family = check.family;
    } else {
      console.warn(
        `[updateProduct] no se pudo asegurar familia "${payload.family}" (${check.reason}). Continúo sin enviarla — la API rechazará si exige cambio.`,
      );
      delete payload.family;
    }
  }

  const autoFilled: string[] = [];

  // Política de Marco: los únicos campos OBLIGATORIOS para publicar son
  // nombre, ref e imagen. Todo lo demás se rellena con placeholders neutros
  // ANTES del PUT para que el publish-gate del socio no nos rechace.
  if (payload.status === "published") {
    const filled = await enrichForPublish(payload, form.brand);
    autoFilled.push(...filled);
  }

  let res = await doProductPut(ref, payload);
  // Bucle defensivo: hasta 3 reintentos por si la API revela campos faltantes
  // en cascada (devuelve sólo el primero, lo rellenamos, vuelve a fallar con otro).
  const working: Record<string, unknown> = { ...payload };
  for (let attempt = 0; attempt < 3; attempt++) {
    if (res.ok) break;
    if (res.status !== 400) break;
    if (payload.status !== "published" && form.status !== "published") break;

    const detail = await readErrorDetail(res);
    console.log(`[updateProduct] 400 detail (attempt ${attempt}):`, detail);
    const looksLikePublishGate =
      /faltan campos obligatorios/i.test(detail) ||
      /no se puede publicar/i.test(detail);
    if (!looksLikePublishGate) {
      console.log(`[updateProduct] 400 no parece publish-gate, no reintento`);
      break;
    }

    // Extrae la lista de campos que faltan ("...: marca, alérgenos").
    const match = detail.match(/obligatorios?:\s*([^.]+)/i);
    const fields = (match?.[1] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    console.log(`[updateProduct] campos faltantes parseados:`, fields);
    if (fields.length === 0) break;

    let touched = false;
    for (const f of fields) {
      const ph = placeholderFor(f);
      if (!ph) {
        console.warn(`[updateProduct] no hay placeholder para campo "${f}" — añadir mapping en placeholderFor()`);
        continue;
      }
      // Sólo lo rellenamos si no había nada (no pisamos datos del editor).
      const current = working[ph.key];
      if (current != null && current !== "") continue;

      // Brand es especial: tiene FK estricta a la tabla `brands`. Si vamos a meter
      // un placeholder ("Sin marca"), necesitamos que exista en la tabla primero.
      let valueToUse: unknown = ph.value;
      if (ph.key === "brand" && typeof ph.value === "string") {
        const ensure = await ensureBrandExists(ph.value).catch(() => null);
        if (ensure && ensure.ok) {
          valueToUse = ensure.brand;
        } else {
          console.warn(`[updateProduct] no se pudo crear marca placeholder "${ph.value}" (${ensure?.reason ?? "error"}). Skip.`);
          continue;
        }
      }

      working[ph.key] = valueToUse;
      autoFilled.push(f);
      touched = true;
    }
    if (!touched) {
      console.warn(`[updateProduct] ningún campo nuevo que rellenar, abortando retries`);
      break;
    }

    console.log(
      `[updateProduct] retry ${attempt + 1} para ${ref}, auto-fill:`,
      autoFilled,
      "payload:",
      JSON.stringify(working),
    );
    res = await doProductPut(ref, working);
  }

  const data = (await jsonOr("updateProduct", res)) as Record<string, unknown>;

  revalidatePath(`/admin/products/${ref}`);
  revalidatePath(`/admin/products`);
  const slug = typeof data.slug === "string" ? data.slug : undefined;
  // Invalida /es/catalogo, /ca/cataleg, secciones temáticas y ambas
  // URLs del producto (ES + CA). Sin esto, la edición tardaría hasta
  // 1h en verse en producción tras el refactor i18n.
  await revalidatePublicAll(slug);
  return {
    product: data,
    ...(autoFilled.length > 0 ? { autoFilledFields: autoFilled } : {}),
    ...(slug ? { newSlug: slug } : {}),
  };
}

// =============================================================
// Wrappers "Safe": devuelven el error en vez de lanzarlo.
// En producción, Next.js OCULTA el mensaje de cualquier error lanzado en una
// Server Action y muestra el genérico "An error occurred in the Server
// Components render…". Al DEVOLVER el error como dato, el mensaje real —que
// jsonOr ya construye con el status + cuerpo de la API del socio— llega intacto
// al formulario y se le muestra al editor. Úsalos desde los forms del cliente.
// =============================================================
export type SafeResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function updateProductSafe(
  ref: string,
  form: FormFields,
): Promise<SafeResult<UpdateProductResult>> {
  try {
    return { ok: true, data: await updateProduct(ref, form) };
  } catch (e) {
    console.error("[updateProductSafe]", e);
    return { ok: false, error: (e as Error).message };
  }
}

export async function createProductSafe(
  form: FormFields & { ref?: string },
): Promise<SafeResult<Record<string, unknown>>> {
  try {
    return { ok: true, data: await createProduct(form) };
  } catch (e) {
    console.error("[createProductSafe]", e);
    return { ok: false, error: (e as Error).message };
  }
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
  // Borrar (soft o hard) también debe refrescar el escaparate público: si no,
  // la ficha borrada sigue saliendo en /es/quesos y demás listados hasta que
  // caduque el ISR (≤1h). El guardado ya lo hacía (revalidatePublicAll); el
  // borrado se lo saltaba.
  await revalidatePublicListings();
  return data;
}

// =============================================================
// Subir imagen del producto (multipart → Cloudinary)
// =============================================================
//
// Hay dos variantes:
//
//   - POST /catalog/products/{ref}/image (singular, alias antiguo):
//       sustituye gallery[0] (la principal). Lo mantenemos para retrocompat.
//
//   - POST /catalog/products/{ref}/images (plural, NUEVO):
//       añade una foto al final de la galería, sin tocar las anteriores.
//
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

/** Añade una imagen a la galería (no sustituye las anteriores). */
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
  return data as { image_url: string; gallery: string[] };
}

/** Elimina una imagen concreta de la galería del producto. */
export async function removeProductImage(ref: string, url: string) {
  await requireAdmin();
  const qs = new URLSearchParams({ url }).toString();
  const res = await fetch(
    `${AURELLANO_API}/catalog/products/${encodeURIComponent(ref)}/images?${qs}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey()}` },
    },
  );
  const data = await jsonOr("removeProductImage", res);
  revalidatePath(`/admin/products/${ref}`);
  revalidatePath(`/admin/products`);
  return data as { gallery: string[] };
}

/** Reordena la galería del producto. La primera URL pasa a ser la principal. */
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
  return data as { gallery: string[] };
}

/** Marca una URL como imagen principal (sin cambiar el resto del orden si no es necesario). */
export async function setPrimaryProductImage(ref: string, url: string) {
  await requireAdmin();
  const res = await fetch(
    `${AURELLANO_API}/catalog/products/${encodeURIComponent(ref)}/images/primary`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey()}`,
      },
      body: JSON.stringify({ primary: url }),
    },
  );
  const data = await jsonOr("setPrimaryProductImage", res);
  revalidatePath(`/admin/products/${ref}`);
  revalidatePath(`/admin/products`);
  return data as { image_url: string; gallery: string[] };
}
