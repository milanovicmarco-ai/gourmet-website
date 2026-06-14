/**
 * Bulk import desde Excel — versión LOCAL (corre en la Mac de Marco, no en Vercel).
 *
 * Para qué: subir Excels grandes (100, 300, 1000 filas) sin chocarse con el
 * límite de 60s de los Server Actions de Vercel Hobby. Reutiliza el mismo
 * esquema que el bulk import del PIM, así que un Excel válido para uno lo
 * es para el otro.
 *
 * Uso:
 *   npx tsx scripts/bulk-import-local.ts ./ruta/al/archivo.xlsx
 *
 * Requisitos (en .env de la raíz del proyecto):
 *   NEXT_PUBLIC_AURELLANO_API     URL del backend del socio (sin slash final)
 *   ADMIN_API_KEY                 Bearer token para PUT/POST /catalog
 *   NEXT_PUBLIC_SUPABASE_URL      URL del proyecto Supabase
 *   SUPABASE_SERVICE_ROLE_KEY     Service role key (bypass de RLS — server-only)
 *
 * Salida: progreso por fila + resumen final con creados / modificados / borrados
 * / avisos (degradados a draft por marca problemática) / errores.
 */

import "dotenv/config";
import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

import { mapToApi, type FormFields } from "../src/lib/pim/api-mapper";
import {
  BULK_HEADERS,
  importRowFromObject,
  type ImportRow,
} from "../src/lib/pim/bulk-schema";
import { ensureBrandExists } from "../src/lib/pim/ensure-brand";

// ──────────────────────────────────────────────────────────────────────────────
// Env + clients
// ──────────────────────────────────────────────────────────────────────────────

const ENV = {
  apiUrl: process.env.NEXT_PUBLIC_AURELLANO_API,
  adminKey: process.env.ADMIN_API_KEY,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

for (const [k, v] of Object.entries(ENV)) {
  if (!v) {
    console.error(`✖ Falta ${k} en .env.local`);
    process.exit(1);
  }
}

const API = ENV.apiUrl as string;
const KEY = ENV.adminKey as string;

const supabase = createClient(ENV.supabaseUrl as string, ENV.supabaseServiceKey as string, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const apiHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${KEY}`,
});

// ──────────────────────────────────────────────────────────────────────────────
// Excel
// ──────────────────────────────────────────────────────────────────────────────

function loadRows(path: string): ImportRow[] {
  const buf = readFileSync(path);
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames.find((n) => n.toLowerCase() === "productos") ?? wb.SheetNames[0];
  if (!sheetName) throw new Error("El xlsx no tiene hojas.");
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    raw: false,
    defval: "",
    header: BULK_HEADERS,
    range: 1, // saltamos la fila de header
  });
  return aoa.map(importRowFromObject);
}

// ──────────────────────────────────────────────────────────────────────────────
// API helpers (reimplementados sin "use server" para correr en Node)
// ──────────────────────────────────────────────────────────────────────────────

async function listProductsPaged(limit = 200, family?: string): Promise<{ ref: string }[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (family) qs.set("family", family);
  const res = await fetch(`${API}/catalog/products?${qs}`, { headers: apiHeaders() });
  if (!res.ok) return [];
  const json = (await res.json()) as { results?: { ref: string }[] };
  return json.results ?? [];
}

async function listFamiliesApi(): Promise<{ family: string }[]> {
  const res = await fetch(`${API}/catalog/families`, { headers: apiHeaders() });
  if (!res.ok) return [];
  const raw = await res.json();
  const arr = Array.isArray(raw) ? raw : raw.results ?? [];
  return arr.map((f: { family?: string; slug?: string; name?: string }) => ({
    family: (f.family || f.slug || f.name || "") as string,
  })).filter((f: { family: string }) => f.family);
}

/** Devuelve TODOS los refs del catálogo iterando por familia para no quedarse
 *  cortos con un solo GET /products?limit=200. */
async function fetchExistingRefs(): Promise<Set<string>> {
  const set = new Set<string>();
  const base = await listProductsPaged(200);
  for (const p of base) set.add(p.ref);
  const families = await listFamiliesApi();
  for (const f of families) {
    const r = await listProductsPaged(200, f.family);
    for (const p of r) set.add(p.ref);
  }
  return set;
}

// Inline mini-version de ensureFamilyExists (vive como server action en el
// proyecto principal y no se puede importar fuera). Mismo patrón: GET → POST con
// varias shapes → fallback a borrar la familia del payload.
const FAMILY_SLUG = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");

async function ensureFamilyExists(
  slug: string | undefined,
): Promise<{ ok: true; family: string } | { ok: false; reason: string }> {
  if (!slug || slug.trim().length === 0) return { ok: false, reason: "empty" };
  const canonical = FAMILY_SLUG(slug);
  const display = canonical;

  // GET
  try {
    const res = await fetch(`${API}/catalog/families`, { headers: apiHeaders() });
    if (res.ok) {
      const raw = await res.json();
      const families = Array.isArray(raw) ? raw : raw.results ?? [];
      const target = canonical.toLowerCase();
      const match = families.find((f: { slug?: string; family?: string; name?: string }) => {
        const id = (f.slug || f.family || f.name || "").toString();
        return id.toLowerCase() === target || id === canonical;
      });
      if (match) {
        const found = (match.slug || match.family || match.name || canonical).toString();
        return { ok: true, family: found };
      }
    }
  } catch {
    /* fallthrough */
  }

  // POST con varias shapes
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
  for (const body of shapes) {
    try {
      const res = await fetch(`${API}/catalog/families`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const created = (await res.json()) as { slug?: string; family?: string; name?: string };
        const name = (created.slug || created.family || created.name || canonical).toString();
        return { ok: true, family: name };
      }
      const text = await res.text().catch(() => "");
      lastReason = `POST /families ${res.status}: ${text.slice(0, 200)}`;
      if (res.status === 409) return { ok: true, family: canonical };
    } catch (err) {
      lastReason = (err as Error).message;
    }
  }
  return { ok: false, reason: lastReason || "todas las shapes rechazadas" };
}

async function ensureFamilyInPayload(body: Record<string, unknown>) {
  if (typeof body.family === "string" && body.family.trim().length > 0) {
    const check = await ensureFamilyExists(body.family);
    if (check.ok) body.family = check.family;
    else delete body.family;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Publish-gate: misma estrategia que el bulk del PIM. Si la marca no se puede
// asegurar, degradamos a draft y devolvemos un warning.
// ──────────────────────────────────────────────────────────────────────────────

type PublishOutcome =
  | { kind: "ok" }
  | { kind: "downgraded"; warning: string };

/** Resultado de la preparación del payload para publicar. Si la marca se
 *  resolvió, también devolvemos el slug por si hay que reintentar con él
 *  (la FK de /catalog/products usa el slug, no siempre el name). */
type PrepareResult = {
  outcome: PublishOutcome;
  /** Slug canónico para reintentar si el primer envío con el name falla. */
  fallbackSlug?: string;
};

/** Detecta valores "basura" que el usuario pone como sentinel de "sin marca"
 *  (típico: "-", "—", "•", ".", "  ", "n/a", etc). Si al normalizar quitando
 *  acentos y caracteres no alfanuméricos queda string vacío, el backend del
 *  socio no podrá generar slug y rechazará el POST con "Slug vacío tras
 *  normalizar." → evitamos los 4 round-trips inútiles y degradamos directo. */
function isJunkBrand(brand: string): boolean {
  const normalized = brand
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  return normalized.length === 0;
}

async function ensureBrandForPublish(
  body: Record<string, unknown>,
  brand: string | null | undefined,
): Promise<PrepareResult> {
  if (body.status !== "published") return { outcome: { kind: "ok" } };

  if (!brand || brand.trim().length === 0 || isJunkBrand(brand)) {
    body.status = "draft";
    const reason = !brand || brand.trim().length === 0
      ? "sin marca"
      : `marca "${brand}" no normalizable (solo caracteres no válidos)`;
    return {
      outcome: {
        kind: "downgraded",
        warning: `${reason} → guardado como draft (la API del socio exige marca para publicar)`,
      },
    };
  }

  const check = await ensureBrandExists(brand);
  if (check.ok) {
    body.brand = check.brand;
    return { outcome: { kind: "ok" }, fallbackSlug: check.slug };
  }

  body.status = "draft";
  delete body.brand;
  return {
    outcome: {
      kind: "downgraded",
      warning: `marca "${brand}" no se pudo crear en el backend (${check.reason}) → guardado como draft`,
    },
  };
}

/** ¿El cuerpo de error del PUT/POST indica que la FK de marca no encuentra el
 *  valor que enviamos? Si sí, vale la pena reintentar con el slug en lugar
 *  del name. */
function isBrandFKError(text: string): boolean {
  return /marca.*no\s+existe/i.test(text);
}

/** ¿El publish-gate rechaza por imagen faltante? mapToApi no incluye image_url
 *  en el payload, FastAPI lo interpreta como null y borra la imagen → gate falla. */
function isMissingImageError(text: string): boolean {
  return /faltan.*campos.*obligatorios.*imag/i.test(text);
}

/** Devuelve la imagen principal actual del producto. Mira primero
 *  `image_url`; si está vacío, cae a `gallery[0]` (algunos productos antiguos
 *  solo tienen la imagen en gallery). Si tampoco hay, devuelve null. */
async function fetchCurrentImageUrl(ref: string): Promise<string | null> {
  try {
    const res = await fetch(`${API}/catalog/products/${encodeURIComponent(ref)}`, {
      headers: apiHeaders(),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      image_url?: string | null;
      gallery?: string[] | null;
    };
    if (data.image_url && data.image_url.trim().length > 0) return data.image_url;
    if (Array.isArray(data.gallery) && data.gallery[0]) return data.gallery[0];
    return null;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Operaciones de producto — con reintento brand=slug si el FK rechaza el name
// ──────────────────────────────────────────────────────────────────────────────

type ApiProductMin = { ref: string; slug?: string | null };

async function putProduct(ref: string, body: Record<string, unknown>, brand?: string | null) {
  await ensureFamilyInPayload(body);
  const prep = await ensureBrandForPublish(body, brand);
  let outcome: PublishOutcome = prep.outcome;
  const fallbackSlug = prep.fallbackSlug;

  let res = await fetch(`${API}/catalog/products/${encodeURIComponent(ref)}`, {
    method: "PUT",
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });

  // Reintento con slug si la FK rechazó el name.
  if (!res.ok && res.status === 400 && fallbackSlug && body.brand !== fallbackSlug) {
    const text = await res.clone().text().catch(() => "");
    if (isBrandFKError(text)) {
      console.log(`  [retry] PUT ${ref}: la FK rechazó brand="${body.brand}", reintento con slug="${fallbackSlug}"`);
      body.brand = fallbackSlug;
      res = await fetch(`${API}/catalog/products/${encodeURIComponent(ref)}`, {
        method: "PUT",
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
    }
  }

  // Reintento preservando la imagen existente si el publish-gate la pide.
  // mapToApi no envía image_url, FastAPI la interpreta como null y la borra.
  if (!res.ok && res.status === 400) {
    const text = await res.clone().text().catch(() => "");
    const hasImageError = isMissingImageError(text);
    console.log(`  [debug] PUT ${ref} 400: hasImageError=${hasImageError} payloadHasImage=${body.image_url !== undefined}`);
    if (hasImageError && body.image_url === undefined) {
      console.log(`  [retry-img] PUT ${ref}: buscando imagen actual en la API...`);
      const existingImage = await fetchCurrentImageUrl(ref);
      if (existingImage) {
        console.log(`  [retry-img] PUT ${ref}: encontrada → ${existingImage.slice(0, 80)}`);
        body.image_url = existingImage;
        res = await fetch(`${API}/catalog/products/${encodeURIComponent(ref)}`, {
          method: "PUT",
          headers: apiHeaders(),
          body: JSON.stringify(body),
        });
      } else {
        // El producto no tiene imagen en la API → publish imposible. Degradamos a draft.
        console.log(`  [retry-img] PUT ${ref}: SIN imagen en API → degradando a draft`);
        body.status = "draft";
        res = await fetch(`${API}/catalog/products/${encodeURIComponent(ref)}`, {
          method: "PUT",
          headers: apiHeaders(),
          body: JSON.stringify(body),
        });
        if (res.ok && outcome.kind === "ok") {
          outcome = {
            kind: "downgraded",
            warning: "sin imagen en la API → guardado como draft",
          };
        }
      }
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PUT ${ref} ${res.status}: ${text.slice(0, 300)}`);
  }
  const product = (await res.json()) as ApiProductMin;
  return { product, outcome };
}

async function postProduct(body: Record<string, unknown>, brand?: string | null) {
  await ensureFamilyInPayload(body);
  const { outcome, fallbackSlug } = await ensureBrandForPublish(body, brand);

  let res = await fetch(`${API}/catalog/products`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok && res.status === 400 && fallbackSlug && body.brand !== fallbackSlug) {
    const text = await res.clone().text().catch(() => "");
    if (isBrandFKError(text)) {
      console.log(`  [retry] POST: la FK rechazó brand="${body.brand}", reintento con slug="${fallbackSlug}"`);
      body.brand = fallbackSlug;
      res = await fetch(`${API}/catalog/products`, {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(body),
      });
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${res.status}: ${text.slice(0, 300)}`);
  }
  const product = (await res.json()) as ApiProductMin;
  return { product, outcome };
}

async function deleteProductApi(ref: string) {
  const res = await fetch(`${API}/catalog/products/${encodeURIComponent(ref)}`, {
    method: "DELETE",
    headers: apiHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DELETE ${ref} ${res.status}: ${text.slice(0, 300)}`);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Overlay Supabase (product_meta + product_catalogs)
// ──────────────────────────────────────────────────────────────────────────────

function toFormFields(r: ImportRow): FormFields {
  return {
    ref: r.refVisible ?? r.ref ?? undefined,
    name: r.name ?? undefined,
    family: r.family ?? undefined,
    brand: r.brand ?? undefined,
    short_description: r.descripcion_corta ?? undefined,
    long_description: r.description_rich ?? undefined,
    origin: r.origen ?? undefined,
    flavor: r.flavor ?? undefined,
    format: r.format ?? undefined,
    units_per_box: r.units_per_box ?? undefined,
    price_eur: r.price_eur ?? undefined,
    status: r.status ?? undefined,
    seo_title: r.seo_title ?? undefined,
    seo_description: r.seo_description ?? undefined,
    badges: r.tags ?? undefined,
    pairings: r.pairings ?? undefined,
    allergens: r.alergenos ?? undefined,
    ingredients: r.ingredientes ?? undefined,
    gluten_free: r.sin_gluten ?? undefined,
    lactose_free: r.sin_lactosa ?? undefined,
    vegetarian: r.vegetariano ?? undefined,
  };
}

async function applyOverlay(ref: string, r: ImportRow) {
  // Solo escribimos si hay algo que escribir (ahorra writes inútiles).
  if (
    r.brand == null &&
    r.refVisible == null &&
    r.diet_no_nuts == null &&
    r.diet_vegan == null &&
    r.diet_no_added_sugar == null &&
    r.diet_high_protein == null &&
    r.diet_keto == null &&
    r.diet_other == null &&
    r.gama == null &&
    r.momento_plato == null &&
    r.destacado == null &&
    r.primer_precio == null
  ) return;

  const displayRef =
    r.refVisible && r.refVisible.trim().length > 0 && r.refVisible.trim() !== ref
      ? r.refVisible.trim()
      : null;

  const payload: Record<string, unknown> = {
    product_ref: ref,
    display_ref: displayRef,
    brand_override: r.brand?.trim() || null,
    diet_no_nuts: !!r.diet_no_nuts,
    diet_vegan: !!r.diet_vegan,
    diet_no_added_sugar: !!r.diet_no_added_sugar,
    diet_high_protein: !!r.diet_high_protein,
    diet_keto: !!r.diet_keto,
    diet_other: r.diet_other?.trim() || null,
    gama: r.gama,
    momento_plato: r.momento_plato,
    destacado: !!r.destacado,
    primer_precio: !!r.primer_precio,
  };

  const { error } = await supabase
    .from("product_meta")
    .upsert(payload, { onConflict: "product_ref" });
  if (error) {
    // No es crítico: el producto ya subió a la API. Loggeamos pero no rompemos la fila.
    console.warn(`  ⚠ overlay falló para ${ref}: ${error.message}`);
  }
}

async function applyCatalogs(ref: string, slugs: string[] | null) {
  if (!slugs) return; // null = no cambiar
  const { data: cats, error: catsErr } = await supabase
    .from("catalogs")
    .select("id, slug")
    .in("slug", slugs);
  if (catsErr) {
    console.warn(`  ⚠ catalogs lookup falló para ${ref}: ${catsErr.message}`);
    return;
  }
  const ids = (cats ?? []).map((c) => c.id as string);
  await supabase.from("product_catalogs").delete().eq("product_ref", ref);
  if (ids.length > 0) {
    const { error: insErr } = await supabase
      .from("product_catalogs")
      .insert(ids.map((catalog_id) => ({ product_ref: ref, catalog_id })));
    if (insErr) console.warn(`  ⚠ insert product_catalogs falló para ${ref}: ${insErr.message}`);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Uso: npx tsx scripts/bulk-import-local.ts <ruta/al/archivo.xlsx>");
    process.exit(1);
  }

  const absPath = resolve(process.cwd(), path);
  console.log(`Excel: ${absPath}`);
  console.log(`API:   ${API}`);
  console.log();

  console.log("Leyendo Excel...");
  const rows = loadRows(absPath);
  console.log(`  ${rows.length} filas`);

  console.log("Cargando catálogo actual (para detectar create vs update)...");
  const existing = await fetchExistingRefs();
  console.log(`  ${existing.size} refs ya existentes`);
  console.log();

  const stats = { created: 0, updated: 0, deleted: 0, warnings: 0, errors: 0 };
  const warningsList: { line: number; ref: string | null; msg: string }[] = [];
  const errorsList: { line: number; ref: string | null; msg: string }[] = [];

  const t0 = Date.now();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const line = i + 2; // +2 porque fila 1 es header
    const tag = `[${i + 1}/${rows.length}]`;

    try {
      if (r.borrar) {
        if (!r.ref || !existing.has(r.ref)) throw new Error("marcada para borrar pero ref inválida");
        await deleteProductApi(r.ref);
        stats.deleted++;
        console.log(`${tag} ${r.ref} BORRADO`);
        continue;
      }

      if (!r.ref || !existing.has(r.ref)) {
        if (!r.name) throw new Error("falta nombre");
        const payload = mapToApi(toFormFields(r));
        if (r.ref) payload.ref = r.ref;
        const { product, outcome } = await postProduct(payload, r.brand);
        await applyOverlay(product.ref, r);
        await applyCatalogs(product.ref, r.catalogos);
        stats.created++;
        if (outcome.kind === "downgraded") {
          stats.warnings++;
          warningsList.push({ line, ref: product.ref, msg: outcome.warning });
          console.log(`${tag} ${product.ref} CREADO ⚠ ${outcome.warning}`);
        } else {
          console.log(`${tag} ${product.ref} CREADO`);
        }
        continue;
      }

      const payload = mapToApi(toFormFields(r));
      const { outcome } = await putProduct(r.ref, payload, r.brand);
      await applyOverlay(r.ref, r);
      await applyCatalogs(r.ref, r.catalogos);
      stats.updated++;
      if (outcome.kind === "downgraded") {
        stats.warnings++;
        warningsList.push({ line, ref: r.ref, msg: outcome.warning });
        console.log(`${tag} ${r.ref} MODIFICADO ⚠ ${outcome.warning}`);
      } else {
        console.log(`${tag} ${r.ref} MODIFICADO`);
      }
    } catch (err) {
      stats.errors++;
      const msg = (err as Error).message;
      errorsList.push({ line, ref: r.ref, msg });
      console.error(`${tag} ${r.ref ?? "(sin ref)"} ✖ ${msg}`);
    }
  }

  const tSec = ((Date.now() - t0) / 1000).toFixed(1);

  console.log();
  console.log("─".repeat(60));
  console.log(`Resumen (${tSec}s):`);
  console.log(`  Creados:     ${stats.created}`);
  console.log(`  Modificados: ${stats.updated}`);
  console.log(`  Borrados:    ${stats.deleted}`);
  console.log(`  Avisos:      ${stats.warnings}  (degradados a draft)`);
  console.log(`  Errores:     ${stats.errors}`);

  if (warningsList.length > 0) {
    console.log();
    console.log("Avisos (productos guardados como draft):");
    for (const w of warningsList) {
      console.log(`  Fila ${w.line}${w.ref ? ` (${w.ref})` : ""}: ${w.msg}`);
    }
  }
  if (errorsList.length > 0) {
    console.log();
    console.log("Errores (filas que NO se aplicaron):");
    for (const e of errorsList) {
      console.log(`  Fila ${e.line}${e.ref ? ` (${e.ref})` : ""}: ${e.msg}`);
    }
  }
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
