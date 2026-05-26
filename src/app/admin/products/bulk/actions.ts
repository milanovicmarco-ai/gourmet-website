"use server";

// Bulk import desde Excel.
//
// Dos server actions:
//   - previewImport(formData): parsea el xlsx subido y devuelve un diff vs el
//     estado actual del catálogo (qué se va a crear, modificar, borrar) SIN
//     aplicar nada todavía. Marco lo confirma en la UI antes de aplicar.
//   - applyImport(formData): aplica los cambios (PUT/POST/DELETE por fila),
//     devolviendo un reporte con éxitos y errores.
//
// El parseo + mapping a ImportRow vive en bulk-schema.ts — esa es la fuente
// de verdad. Aquí sólo orquestamos.

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { createClient } from "@/integrations/supabase/server";
import {
  BULK_HEADERS,
  importRowFromObject,
  type ImportRow,
} from "@/lib/pim/bulk-schema";
import { listProducts, listFamilies, AURELLANO_API, type ApiProduct } from "@/lib/pim/api";
import { mapToApi, type FormFields } from "@/lib/pim/api-mapper";
import { saveProductMeta } from "../[id]/meta-actions";
import { ensureFamilyExists } from "../actions";
import { ensureBrandExists } from "@/lib/pim/ensure-brand";

// ──────────────────────────────────────────────────────────────────────────────
// Auth + util
// ──────────────────────────────────────────────────────────────────────────────

const apiKey = () => {
  const k = process.env.ADMIN_API_KEY;
  if (!k) throw new Error("Falta ADMIN_API_KEY en el entorno (server-only).");
  return k;
};

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
}

// ──────────────────────────────────────────────────────────────────────────────
// Diff calculation
// ──────────────────────────────────────────────────────────────────────────────

export type DiffSummary = {
  toCreate: number;
  toUpdate: number;
  toDelete: number;
  invalid: number;
  invalidReasons: string[];
  rows: ImportRow[];
};

async function parseXlsx(formData: FormData): Promise<ImportRow[]> {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Falta el archivo .xlsx");
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames.find((n) => n.toLowerCase() === "productos") ?? wb.SheetNames[0];
  if (!sheetName) throw new Error("El xlsx no tiene hojas.");
  const ws = wb.Sheets[sheetName];

  // sheet_to_json con header:1 nos da un array de arrays; con defval:'' rellena vacíos.
  const aoa = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    raw: false,
    defval: "",
    header: BULK_HEADERS,
    range: 1, // saltamos la fila de header
  });

  return aoa.map(importRowFromObject);
}

async function fetchAllProductRefs(): Promise<Set<string>> {
  const families = await listFamilies().catch(() => []);
  const set = new Set<string>();
  const base = await listProducts({ limit: 200 }).catch(() => ({ results: [] }));
  for (const p of base.results) set.add(p.ref);
  for (const f of families) {
    const r = await listProducts({ limit: 200, family: f.family }).catch(() => ({ results: [] }));
    for (const p of r.results) set.add(p.ref);
  }
  return set;
}

export async function previewImport(formData: FormData): Promise<DiffSummary> {
  await requireAdmin();
  const rows = await parseXlsx(formData);
  const existing = await fetchAllProductRefs();

  const summary: DiffSummary = {
    toCreate: 0,
    toUpdate: 0,
    toDelete: 0,
    invalid: 0,
    invalidReasons: [],
    rows,
  };

  rows.forEach((r, idx) => {
    const line = idx + 2; // +2 porque fila 1 es header
    if (r.borrar) {
      if (!r.ref) {
        summary.invalid++;
        summary.invalidReasons.push(`Fila ${line}: marcada como borrar pero sin ref.`);
      } else if (!existing.has(r.ref)) {
        summary.invalid++;
        summary.invalidReasons.push(`Fila ${line}: ref "${r.ref}" no existe en el catálogo.`);
      } else {
        summary.toDelete++;
      }
      return;
    }
    if (!r.ref) {
      // Creación: requiere al menos nombre
      if (!r.name) {
        summary.invalid++;
        summary.invalidReasons.push(`Fila ${line}: fila vacía o sin nombre (necesario para crear).`);
      } else {
        summary.toCreate++;
      }
      return;
    }
    if (!existing.has(r.ref)) {
      // Ref nueva → tratamos como creación
      if (!r.name) {
        summary.invalid++;
        summary.invalidReasons.push(`Fila ${line}: ref "${r.ref}" no existe y la fila no tiene nombre.`);
      } else {
        summary.toCreate++;
      }
      return;
    }
    summary.toUpdate++;
  });

  return summary;
}

// ──────────────────────────────────────────────────────────────────────────────
// Apply
// ──────────────────────────────────────────────────────────────────────────────

export type ApplyResult = {
  created: { ref: string }[];
  updated: { ref: string }[];
  deleted: { ref: string }[];
  errors: { line: number; ref: string | null; message: string }[];
};

/** Convierte un ImportRow al shape FormFields que entiende mapToApi. */
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

async function ensureFamilyInPayload(body: Record<string, unknown>) {
  if (typeof body.family === "string" && body.family.trim().length > 0) {
    const check = await ensureFamilyExists(body.family);
    if (check.ok) body.family = check.family;
    else delete body.family;
  }
}

/**
 * Si la fila va a "published" y tiene marca, asegurar que la marca existe
 * en /catalog/brands (FK estricta) e incluirla en el payload. `mapToApi`
 * deliberadamente NO envía brand (queda en el overlay de Supabase para la web
 * pública), pero el backend del socio exige marca para PUBLICAR. Por eso aquí
 * la inyectamos justo antes del PUT/POST.
 */
async function ensureBrandInPayloadIfPublishing(
  body: Record<string, unknown>,
  brand: string | null | undefined,
) {
  if (body.status !== "published") return;
  if (!brand || brand.trim().length === 0) return;
  const check = await ensureBrandExists(brand);
  if (check.ok) {
    body.brand = check.brand;
  } else {
    console.warn(
      `[bulk] no se pudo asegurar marca "${brand}" (${check.reason}). El PUT/POST probablemente fallará.`,
    );
  }
}

async function putProduct(ref: string, body: Record<string, unknown>, brand?: string | null) {
  await ensureFamilyInPayload(body);
  await ensureBrandInPayloadIfPublishing(body, brand);
  const res = await fetch(`${AURELLANO_API}/catalog/products/${encodeURIComponent(ref)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PUT ${ref} ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as ApiProduct;
}

async function postProduct(body: Record<string, unknown>, brand?: string | null) {
  await ensureFamilyInPayload(body);
  await ensureBrandInPayloadIfPublishing(body, brand);
  const res = await fetch(`${AURELLANO_API}/catalog/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as ApiProduct;
}

async function deleteProductApi(ref: string) {
  const res = await fetch(`${AURELLANO_API}/catalog/products/${encodeURIComponent(ref)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey()}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DELETE ${ref} ${res.status}: ${text.slice(0, 300)}`);
  }
}

async function applyOverlay(ref: string, r: ImportRow) {
  // Sólo escribimos overlay si hay algo que escribir.
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
  ) {
    return;
  }
  await saveProductMeta({
    product_ref: ref,
    display_ref: r.refVisible ?? null,
    brand_override: r.brand ?? null,
    diet_no_nuts: !!r.diet_no_nuts,
    diet_vegan: !!r.diet_vegan,
    diet_no_added_sugar: !!r.diet_no_added_sugar,
    diet_high_protein: !!r.diet_high_protein,
    diet_keto: !!r.diet_keto,
    diet_other: r.diet_other ?? null,
    gama: r.gama,
    momento_plato: r.momento_plato as
      | "aperitivo"
      | "entrante"
      | "principal"
      | "guarnicion"
      | "postre"
      | null,
    destacado: !!r.destacado,
    primer_precio: !!r.primer_precio,
  }).catch((err) => {
    // El meta no es crítico (no romper el batch). Lo loggeamos.
    console.warn(`[bulk applyOverlay] ${ref}:`, (err as Error).message);
  });
}

async function applyCatalogs(ref: string, slugs: string[] | null) {
  if (!slugs) return; // null = no cambiar
  const supabase = await createClient();
  // Lookup ids de catálogos por slug
  const { data: cats } = await supabase.from("catalogs").select("id, slug").in("slug", slugs);
  const ids = (cats ?? []).map((c) => c.id as string);
  // Wipe + reinsertar
  await supabase.from("product_catalogs").delete().eq("product_ref", ref);
  if (ids.length > 0) {
    await supabase
      .from("product_catalogs")
      .insert(ids.map((catalog_id) => ({ product_ref: ref, catalog_id })));
  }
}

export async function applyImport(formData: FormData): Promise<ApplyResult> {
  await requireAdmin();
  const rows = await parseXlsx(formData);
  const existing = await fetchAllProductRefs();

  const result: ApplyResult = { created: [], updated: [], deleted: [], errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const line = i + 2;
    try {
      if (r.borrar) {
        if (!r.ref || !existing.has(r.ref)) {
          throw new Error("marcada para borrar pero ref inválida");
        }
        await deleteProductApi(r.ref);
        result.deleted.push({ ref: r.ref });
        continue;
      }

      if (!r.ref || !existing.has(r.ref)) {
        // Crear
        if (!r.name) throw new Error("falta nombre");
        const payload = mapToApi(toFormFields(r));
        // Si el usuario puso una ref nueva, la incluimos como hint (algunas APIs la usan).
        if (r.ref) payload.ref = r.ref;
        const created = await postProduct(payload, r.brand);
        await applyOverlay(created.ref, r);
        await applyCatalogs(created.ref, r.catalogos);
        result.created.push({ ref: created.ref });
        continue;
      }

      // Update
      const payload = mapToApi(toFormFields(r));
      await putProduct(r.ref, payload, r.brand);
      await applyOverlay(r.ref, r);
      await applyCatalogs(r.ref, r.catalogos);
      result.updated.push({ ref: r.ref });
    } catch (err) {
      result.errors.push({ line, ref: r.ref, message: (err as Error).message });
    }
  }

  // Refresca todas las vistas que dependen del catálogo.
  revalidatePath("/admin/products");
  revalidatePath("/catalogo");
  return result;
}
