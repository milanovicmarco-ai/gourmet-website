/**
 * Import bulk de TRADUCCIONES desde Excel — versión LOCAL.
 *
 * Para cuando Marco tiene un Excel SEPARADO con el contenido en catalán de
 * sus productos (típicamente generado por una traductora externa). Cada fila
 * lleva la `ref` del producto y los campos traducidos. El script hace upsert
 * en `product_translations` (locale='ca' por defecto).
 *
 * Formato esperado del Excel (headers en la fila 1):
 *   ref              — Obligatoria. Debe existir en la API del socio.
 *   name             — Nombre catalán
 *   descripcion_corta
 *   description_rich
 *   flavor
 *   origen
 *   ingredientes
 *   seo_title
 *   seo_description
 *   locale           — Opcional. Default 'ca'. Útil si en el futuro
 *                      llegan ingleses ('en') por el mismo flujo.
 *
 * Reglas:
 *   - Celdas vacías NO sobrescriben el valor actual (merge sensato).
 *   - Si ref no existe en la API, la fila se reporta como warning y no se aplica.
 *   - Si la fila no trae ningún campo traducible relleno, se salta.
 *
 * Uso:
 *   npm run bulk-translate-import -- ~/Desktop/catalan.xlsx
 *   npm run bulk-translate-import -- ~/Desktop/catalan.xlsx --dry-run
 *
 * Requisitos (en .env):
 *   NEXT_PUBLIC_AURELLANO_API     URL del backend del socio
 *   ADMIN_API_KEY                 Bearer token
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY     Service role (bypass RLS, server-only)
 */

import "dotenv/config";
import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

import { fetchAllProducts } from "../src/lib/pim/api";

// ──────────────────────────────────────────────────────────────────────────────
// Env
// ──────────────────────────────────────────────────────────────────────────────

const ENV = {
  apiUrl: process.env.NEXT_PUBLIC_AURELLANO_API,
  adminKey: process.env.ADMIN_API_KEY,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

for (const [k, v] of Object.entries(ENV)) {
  if (!v) {
    console.error(`✖ Falta ${k} en .env`);
    process.exit(1);
  }
}

const DRY_RUN = process.argv.includes("--dry-run");

const supabase = createClient(ENV.supabaseUrl as string, ENV.supabaseServiceKey as string, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ──────────────────────────────────────────────────────────────────────────────
// Esquema
// ──────────────────────────────────────────────────────────────────────────────

const TRANSLATABLE_FIELDS = [
  "name",
  "descripcion_corta",
  "description_rich",
  "flavor",
  "origen",
  "ingredientes",
  "seo_title",
  "seo_description",
] as const;

type TranslatableField = (typeof TRANSLATABLE_FIELDS)[number];

type ParsedRow = {
  line: number;
  ref: string | null;
  locale: string;
  fields: Partial<Record<TranslatableField, string>>;
};

// Aliases tolerantes — si la traductora escribe "nombre" o "name_ca", lo aceptamos.
const HEADER_ALIASES: Record<string, TranslatableField> = {
  name: "name",
  nombre: "name",
  nom: "name",
  name_ca: "name",
  nombre_ca: "name",
  descripcion_corta: "descripcion_corta",
  descripcio_curta: "descripcion_corta",
  short_description: "descripcion_corta",
  description_rich: "description_rich",
  descripcion_larga: "description_rich",
  descripcio_llarga: "description_rich",
  long_description: "description_rich",
  flavor: "flavor",
  sabor: "flavor",
  origen: "origen",
  origin: "origen",
  ingredientes: "ingredientes",
  ingredients: "ingredientes",
  seo_title: "seo_title",
  seo_description: "seo_description",
};

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "_");
}

function stringy(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

// ──────────────────────────────────────────────────────────────────────────────
// Parser
// ──────────────────────────────────────────────────────────────────────────────

function parseExcel(path: string): { rows: ParsedRow[]; warnings: string[] } {
  const buf = readFileSync(path);
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("El xlsx no tiene hojas.");
  const ws = wb.Sheets[sheetName];

  const aoa = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    raw: false,
    defval: "",
  });

  if (aoa.length === 0) return { rows: [], warnings: ["El Excel está vacío"] };

  // Mapear headers reales → campo canónico.
  const sample = aoa[0];
  const headerMap = new Map<string, TranslatableField | "ref" | "locale">();
  const unknownHeaders: string[] = [];
  for (const rawHeader of Object.keys(sample)) {
    const norm = normalizeHeader(rawHeader);
    if (norm === "ref") {
      headerMap.set(rawHeader, "ref");
    } else if (norm === "locale" || norm === "idioma") {
      headerMap.set(rawHeader, "locale");
    } else if (HEADER_ALIASES[norm]) {
      headerMap.set(rawHeader, HEADER_ALIASES[norm]);
    } else {
      unknownHeaders.push(rawHeader);
    }
  }

  const warnings: string[] = [];
  if (unknownHeaders.length > 0) {
    warnings.push(
      `Headers ignorados (no reconocidos): ${unknownHeaders.slice(0, 8).join(", ")}${
        unknownHeaders.length > 8 ? `, … (+${unknownHeaders.length - 8})` : ""
      }`,
    );
  }
  if (!Array.from(headerMap.values()).includes("ref")) {
    throw new Error(
      "No se encuentra la columna 'ref' en el Excel. Es obligatoria para identificar el producto.",
    );
  }

  const rows: ParsedRow[] = aoa.map((row, idx) => {
    const line = idx + 2; // +2: fila 1 son headers
    let ref: string | null = null;
    let locale = "ca";
    const fields: Partial<Record<TranslatableField, string>> = {};
    for (const [rawHeader, canonical] of headerMap) {
      const value = stringy(row[rawHeader]);
      if (canonical === "ref") ref = value;
      else if (canonical === "locale") locale = (value ?? "ca").toLowerCase();
      else if (value != null) fields[canonical] = value;
    }
    return { line, ref, locale, fields };
  });

  return { rows, warnings };
}

// ──────────────────────────────────────────────────────────────────────────────
// Lookup refs existentes en la API (para validar)
// ──────────────────────────────────────────────────────────────────────────────

async function fetchExistingRefs(): Promise<Set<string>> {
  const all = await fetchAllProducts({ revalidate: 60 });
  return new Set(all.map((p) => p.ref));
}

// ──────────────────────────────────────────────────────────────────────────────
// Upsert a product_translations
// ──────────────────────────────────────────────────────────────────────────────

async function upsertTranslation(
  ref: string,
  locale: string,
  fields: Partial<Record<TranslatableField, string>>,
): Promise<void> {
  // Cogemos la traducción existente para hacer merge (celda vacía = no tocar).
  const { data: existing } = await supabase
    .from("product_translations")
    .select("*")
    .eq("product_ref", ref)
    .eq("locale", locale)
    .maybeSingle();

  const merged: Record<string, string | null> = {
    product_ref: ref,
    locale,
  };
  for (const f of TRANSLATABLE_FIELDS) {
    const incoming = fields[f];
    if (incoming != null && incoming.length > 0) {
      merged[f] = incoming;
    } else {
      merged[f] = (existing?.[f] as string | null) ?? null;
    }
  }

  const { error } = await supabase
    .from("product_translations")
    .upsert(merged, { onConflict: "product_ref,locale" });
  if (error) throw new Error(error.message);
}

// ──────────────────────────────────────────────────────────────────────────────
// Concurrency simple
// ──────────────────────────────────────────────────────────────────────────────

async function runInParallel<T, R>(
  items: T[],
  worker: (item: T, idx: number) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function take(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, take));
  return results;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  const path = process.argv.find((a, i) => i >= 2 && !a.startsWith("--"));
  if (!path) {
    console.error("Uso: npx tsx scripts/bulk-translate-import-local.ts <ruta/al/excel.xlsx> [--dry-run]");
    process.exit(1);
  }

  const absPath = resolve(process.cwd(), path);
  console.log(`Excel: ${absPath}`);
  console.log(`Modo:  ${DRY_RUN ? "DRY RUN (no escribe)" : "WRITE"}`);
  console.log();

  console.log("Leyendo Excel...");
  const { rows, warnings } = parseExcel(absPath);
  console.log(`  ${rows.length} filas leídas`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);

  console.log();
  console.log("Validando refs contra la API del socio...");
  const existing = await fetchExistingRefs();
  console.log(`  ${existing.size} refs existen en el backend`);

  // Clasificamos las filas
  const valid: ParsedRow[] = [];
  const skippedNoRef: ParsedRow[] = [];
  const skippedNotInApi: ParsedRow[] = [];
  const skippedEmpty: ParsedRow[] = [];
  for (const r of rows) {
    if (!r.ref) {
      skippedNoRef.push(r);
      continue;
    }
    if (!existing.has(r.ref)) {
      skippedNotInApi.push(r);
      continue;
    }
    const hasContent = Object.values(r.fields).some(
      (v) => typeof v === "string" && v.trim().length > 0,
    );
    if (!hasContent) {
      skippedEmpty.push(r);
      continue;
    }
    valid.push(r);
  }

  console.log();
  console.log(`Resumen previo:`);
  console.log(`  A aplicar:       ${valid.length}`);
  console.log(`  Saltadas (no ref):    ${skippedNoRef.length}`);
  console.log(`  Saltadas (ref no existe): ${skippedNotInApi.length}`);
  console.log(`  Saltadas (sin contenido): ${skippedEmpty.length}`);

  if (skippedNotInApi.length > 0 && skippedNotInApi.length <= 20) {
    console.log();
    console.log("  Refs no encontradas en la API:");
    for (const r of skippedNotInApi) console.log(`    Fila ${r.line}: ${r.ref}`);
  } else if (skippedNotInApi.length > 20) {
    console.log(`  (${skippedNotInApi.length} refs no encontradas — demasiadas para listar)`);
  }

  if (DRY_RUN) {
    console.log();
    console.log("DRY RUN — no se ha escrito nada en Supabase.");
    return;
  }

  if (valid.length === 0) {
    console.log();
    console.log("✓ Nada que aplicar. Salida.");
    return;
  }

  console.log();
  console.log(`Aplicando ${valid.length} traducciones a Supabase...`);
  const t0 = Date.now();
  let done = 0;
  let failed = 0;
  const errors: { line: number; ref: string; msg: string }[] = [];

  await runInParallel(
    valid,
    async (r, idx) => {
      const tag = `[${idx + 1}/${valid.length}]`;
      try {
        await upsertTranslation(r.ref as string, r.locale, r.fields);
        done++;
        const fieldsList = Object.keys(r.fields).join(", ");
        console.log(`${tag} ${r.ref} OK (${r.locale}) · ${fieldsList}`);
      } catch (err) {
        failed++;
        const msg = (err as Error).message;
        errors.push({ line: r.line, ref: r.ref as string, msg });
        console.error(`${tag} ${r.ref} ✖ ${msg.slice(0, 200)}`);
      }
    },
    6,
  );

  const tSec = ((Date.now() - t0) / 1000).toFixed(1);

  console.log();
  console.log("─".repeat(60));
  console.log(`Resumen final (${tSec}s):`);
  console.log(`  Aplicadas: ${done}`);
  console.log(`  Errores:   ${failed}`);
  if (errors.length > 0) {
    console.log();
    console.log("Errores:");
    for (const e of errors.slice(0, 50)) {
      console.log(`  Fila ${e.line} (${e.ref}): ${e.msg.slice(0, 200)}`);
    }
    if (errors.length > 50) console.log(`  … ${errors.length - 50} más`);
  }
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
