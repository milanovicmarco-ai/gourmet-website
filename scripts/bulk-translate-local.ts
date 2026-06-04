/**
 * Bulk translate ES → CA — versión LOCAL (corre en la Mac de Marco).
 *
 * Recorre TODOS los productos publicados del catálogo y, para los que NO tienen
 * traducción al catalán en `product_translations`, llama a OpenAI con la misma
 * voz Aurellano que usa el editor por producto y guarda la traducción.
 *
 * Política:
 *   - Solo productos `status="published"`.
 *   - Salta los que ya tienen entrada `locale="ca"` en product_translations.
 *   - Concurrency=4 para acelerar sin pasarse de rate limit de OpenAI.
 *
 * Uso:
 *   npm run bulk-translate            # traduce todo lo pendiente
 *   npm run bulk-translate -- --dry-run   # lista qué traduciría, sin tocar nada
 *
 * Requisitos (en .env de la raíz del proyecto):
 *   OPENAI_API_KEY
 *   NEXT_PUBLIC_AURELLANO_API
 *   ADMIN_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { chat, SYSTEM_VOICE } from "../src/lib/ai";
import type { ApiProduct } from "../src/lib/pim/api";

// ──────────────────────────────────────────────────────────────────────────────
// Env + clients
// ──────────────────────────────────────────────────────────────────────────────

const ENV = {
  apiUrl: process.env.NEXT_PUBLIC_AURELLANO_API,
  adminKey: process.env.ADMIN_API_KEY,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  openaiKey: process.env.OPENAI_API_KEY,
};
for (const [k, v] of Object.entries(ENV)) {
  if (!v) {
    console.error(`✖ Falta ${k} en .env`);
    process.exit(1);
  }
}

const API = ENV.apiUrl as string;
const ADMIN_KEY = ENV.adminKey as string;

const supabase = createClient(ENV.supabaseUrl as string, ENV.supabaseServiceKey as string, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DRY_RUN = process.argv.includes("--dry-run");
const CONCURRENCY = 4;
const TARGET_LOCALE = "ca";

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
type TranslatableInput = Partial<Record<TranslatableField, string | null>>;
type TranslatableOutput = Partial<Record<TranslatableField, string>>;

// ──────────────────────────────────────────────────────────────────────────────
// Catálogo: listar todos los productos
// ──────────────────────────────────────────────────────────────────────────────

async function listProductsPaged(limit = 200, family?: string): Promise<ApiProduct[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (family) qs.set("family", family);
  const res = await fetch(`${API}/catalog/products?${qs}`, {
    headers: { Authorization: `Bearer ${ADMIN_KEY}` },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { results?: ApiProduct[] };
  return json.results ?? [];
}

async function listFamiliesApi(): Promise<string[]> {
  const res = await fetch(`${API}/catalog/families`, {
    headers: { Authorization: `Bearer ${ADMIN_KEY}` },
  });
  if (!res.ok) return [];
  const raw = await res.json();
  const arr = Array.isArray(raw) ? raw : raw.results ?? [];
  return arr
    .map((f: { family?: string; slug?: string; name?: string }) =>
      (f.family || f.slug || f.name || "") as string,
    )
    .filter(Boolean);
}

async function fetchAllPublishedProducts(): Promise<ApiProduct[]> {
  const map = new Map<string, ApiProduct>();
  const base = await listProductsPaged(200);
  for (const p of base) map.set(p.ref, p);

  const families = await listFamiliesApi();
  // Iteración por familia en paralelo (la API del socio cachea individualmente).
  await Promise.all(
    families.map(async (f) => {
      const items = await listProductsPaged(200, f);
      for (const p of items) map.set(p.ref, p);
    }),
  );

  const all = Array.from(map.values());
  return all.filter((p) => {
    const status = p.status ?? (p.active === false ? "archived" : "published");
    return status === "published";
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Traducciones existentes en Supabase
// ──────────────────────────────────────────────────────────────────────────────

async function fetchExistingCaRefs(): Promise<Set<string>> {
  // Una sola query a product_translations filtrando por locale=ca.
  const { data, error } = await supabase
    .from("product_translations")
    .select("product_ref")
    .eq("locale", TARGET_LOCALE);
  if (error) {
    console.error(`✖ Error leyendo product_translations: ${error.message}`);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.product_ref as string));
}

// ──────────────────────────────────────────────────────────────────────────────
// Traducción (misma lógica que translations-actions.ts pero standalone)
// ──────────────────────────────────────────────────────────────────────────────

async function translateOne(source: TranslatableInput): Promise<TranslatableOutput> {
  const nonEmpty: Record<string, string> = {};
  for (const key of TRANSLATABLE_FIELDS) {
    const v = source[key];
    if (typeof v === "string" && v.trim().length > 0) nonEmpty[key] = v.trim();
  }
  if (Object.keys(nonEmpty).length === 0) return {};

  const userPrompt = `Traduce los siguientes campos de un producto gastronómico de español a catalán. Mantén la voz Aurellano (profesional, gastronómica, sin clichés). Si un campo es Markdown, conserva el formato Markdown (negritas, listas, saltos de párrafo). Si hay términos técnicos gastronómicos en francés/italiano que se usan tal cual en la industria (mi-cuit, ratatouille, parmigiano), NO los traduzcas.

CAMPOS ORIGINALES (JSON):
${JSON.stringify(nonEmpty, null, 2)}

INSTRUCCIONES DE OUTPUT:
- Devuelve SÓLO un objeto JSON válido con las MISMAS CLAVES.
- Cada valor: la traducción del campo correspondiente.
- Sin preamble, sin comentarios, sin bloque \`\`\`.`;

  const result = await chat(
    [
      { role: "system", content: SYSTEM_VOICE },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.3, max_tokens: 1800 },
  );

  const cleaned = result
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  return JSON.parse(cleaned) as TranslatableOutput;
}

async function saveTranslation(
  productRef: string,
  fields: TranslatableOutput,
): Promise<void> {
  const norm = (v: unknown): string | null => {
    if (v == null) return null;
    const s = String(v).trim();
    return s.length === 0 ? null : s;
  };
  const payload = {
    product_ref: productRef,
    locale: TARGET_LOCALE,
    name: norm(fields.name),
    descripcion_corta: norm(fields.descripcion_corta),
    description_rich: norm(fields.description_rich),
    flavor: norm(fields.flavor),
    origen: norm(fields.origen),
    ingredientes: norm(fields.ingredientes),
    seo_title: norm(fields.seo_title),
    seo_description: norm(fields.seo_description),
  };
  const { error } = await supabase
    .from("product_translations")
    .upsert(payload, { onConflict: "product_ref,locale" });
  if (error) throw new Error(`Supabase upsert: ${error.message}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Concurrency simple con pool
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

function productToSource(p: ApiProduct): TranslatableInput {
  return {
    name: p.name,
    descripcion_corta: p.descripcion_corta,
    description_rich: p.description_rich,
    flavor: p.flavor,
    origen: p.origen,
    ingredientes: p.ingredientes,
    seo_title: p.seo_title,
    seo_description: p.seo_description,
  };
}

async function main() {
  console.log(`Modo: ${DRY_RUN ? "DRY RUN (no escribe)" : "WRITE (guarda traducciones)"}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log();

  console.log("Cargando productos publicados de la API...");
  const products = await fetchAllPublishedProducts();
  console.log(`  ${products.length} productos publicados`);

  console.log("Cargando traducciones existentes (locale=ca) de Supabase...");
  const existing = await fetchExistingCaRefs();
  console.log(`  ${existing.size} productos ya traducidos`);

  const pending = products.filter((p) => !existing.has(p.ref));
  console.log(`  → ${pending.length} pendientes de traducir`);
  console.log();

  if (pending.length === 0) {
    console.log("✓ No hay nada que traducir. Salida.");
    return;
  }

  if (DRY_RUN) {
    console.log("DRY RUN — refs que se traducirían:");
    for (const p of pending.slice(0, 50)) {
      console.log(`  ${p.ref} · ${p.name}`);
    }
    if (pending.length > 50) console.log(`  … ${pending.length - 50} más`);
    return;
  }

  let done = 0;
  let skipped = 0;
  let failed = 0;
  const errors: { ref: string; msg: string }[] = [];

  const t0 = Date.now();

  await runInParallel(
    pending,
    async (p, idx) => {
      const tag = `[${idx + 1}/${pending.length}]`;
      try {
        const source = productToSource(p);
        // Skip si literalmente no hay nada que traducir
        const hasContent = TRANSLATABLE_FIELDS.some((k) => {
          const v = source[k];
          return typeof v === "string" && v.trim().length > 0;
        });
        if (!hasContent) {
          skipped++;
          console.log(`${tag} ${p.ref} SKIP (sin campos para traducir)`);
          return;
        }

        const translated = await translateOne(source);
        await saveTranslation(p.ref, translated);
        done++;
        console.log(`${tag} ${p.ref} OK · ${p.name?.slice(0, 50) ?? ""}`);
      } catch (err) {
        failed++;
        const msg = (err as Error).message;
        errors.push({ ref: p.ref, msg });
        console.error(`${tag} ${p.ref} ✖ ${msg.slice(0, 200)}`);
      }
    },
    CONCURRENCY,
  );

  const tSec = ((Date.now() - t0) / 1000).toFixed(1);

  console.log();
  console.log("─".repeat(60));
  console.log(`Resumen (${tSec}s):`);
  console.log(`  Traducidos: ${done}`);
  console.log(`  Saltados:   ${skipped}  (sin contenido)`);
  console.log(`  Errores:    ${failed}`);
  if (errors.length > 0) {
    console.log();
    console.log("Errores:");
    for (const e of errors.slice(0, 50)) {
      console.log(`  ${e.ref}: ${e.msg.slice(0, 200)}`);
    }
    if (errors.length > 50) console.log(`  … ${errors.length - 50} más`);
  }
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
