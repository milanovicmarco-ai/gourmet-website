// Backend del catálogo DENTRO de la web (sustituye a la API FastAPI de la VPS).
//
// `catalogFetch(url, init)` es un sustituto directo de `fetch` para las URLs de
// `${AURELLANO_API}/catalog/...`: en vez de salir por red a la VPS, resuelve la
// petición aquí mismo contra Supabase (tablas catalog_*) y Cloudinary, y
// devuelve un `Response` con el MISMO JSON y los mismos códigos de estado que
// devolvía la API. Así el resto del código (admin, bulk, escaparate) no cambia.
//
// Interruptor de emergencia: CATALOG_BACKEND=api → se vuelve a usar la API de
// la VPS (mientras exista). Por defecto: Supabase.
//
// Reglas replicadas de docs/api-patch/catalog.py (la API original).

import { createHash } from "node:crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { computeOptimizationScore, adaptApiProduct } from "./score";
import type { ApiProduct } from "./api";

// ─────────────────────────────────────────────────────────────────────────────
// Entrada
// ─────────────────────────────────────────────────────────────────────────────

export function catalogBackendIsApi(): boolean {
  return (process.env.CATALOG_BACKEND ?? "").trim().toLowerCase() === "api";
}

/** Igual que `fetch`, pero las URLs del catálogo se resuelven en Supabase. */
export async function catalogFetch(input: string, init?: RequestInit): Promise<Response> {
  const base = apiBase();
  if (catalogBackendIsApi() || !input.startsWith(base)) return fetch(input, init);
  const url = new URL(input);
  const method = (init?.method ?? "GET").toUpperCase();
  try {
    return await route(method, url, init);
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { detail: e.message });
    console.error(`[catalog-backend] ${method} ${url.pathname} falló:`, e);
    return json(500, { detail: `Error interno del catálogo: ${(e as Error).message}` });
  }
}

function apiBase(): string {
  return (
    process.env.NEXT_PUBLIC_AURELLANO_API ?? "https://aurellano-api.srv1124642.hstgr.cloud"
  ).replace(/\/+$/, "");
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function route(method: string, url: URL, init?: RequestInit): Promise<Response> {
  const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  // parts[0] === "catalog"
  if (parts[0] !== "catalog") throw new HttpError(404, `Ruta no soportada: ${url.pathname}`);
  const [, a, b, c, d] = parts;
  const q = url.searchParams;

  if (a === "products") {
    if (!b) {
      if (method === "GET") return json(200, await listProducts(q));
      if (method === "POST") return json(201, await createProduct(await readJson(init)));
    } else if (b === "by-slug" && c && method === "GET") {
      return json(200, await getProduct("slug", c));
    } else if (!c) {
      if (method === "GET") return json(200, await getProduct("ref", b));
      if (method === "PUT") return json(200, await updateProduct(b, await readJson(init)));
      if (method === "DELETE") return json(200, await deleteProduct(b, q));
    } else if (c === "images") {
      if (!d && method === "POST") return json(201, await addImage(b, init));
      if (!d && method === "DELETE") return json(200, await removeImage(b, q.get("url") ?? ""));
      if (d === "order" && method === "PATCH") return json(200, await reorderImages(b, await readJson(init)));
      if (d === "primary" && method === "PATCH") return json(200, await setPrimaryImage(b, await readJson(init)));
    } else if (c === "image" && method === "POST") {
      return json(200, await replacePrimaryImage(b, init));
    }
  } else if (a === "families") {
    if (!b && method === "GET") return json(200, await listFamilies());
    if (!b && method === "POST") return json(201, await createFamily(await readJson(init)));
  } else if (a === "brands") {
    if (!b && method === "GET") return json(200, await listBrands(q));
    if (b && method === "GET") return json(200, await getBrand(b));
    if (!b && method === "POST") return json(201, await createBrand(await readJson(init)));
  }
  throw new HttpError(404, `Ruta del catálogo no soportada: ${method} ${url.pathname}`);
}

async function readJson(init?: RequestInit): Promise<Record<string, unknown>> {
  const body = init?.body;
  if (body == null) return {};
  const parsed = typeof body === "string" ? JSON.parse(body) : JSON.parse(await new Response(body).text());
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError(422, "El cuerpo debe ser un objeto JSON.");
  }
  return parsed as Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Clientes Supabase
// ─────────────────────────────────────────────────────────────────────────────

const SB_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
let readSb: SupabaseClient | null = null;

/** Lecturas: anon key (el catálogo es público; RLS de lectura abierta). */
function reader(): SupabaseClient {
  readSb ??= createSupabaseClient(SB_URL(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return readSb;
}

/** Escrituras: dentro de Next, con la SESIÓN del admin (RLS: solo usuarios
 *  autenticados). Fuera de Next (scripts locales), con la service role key. */
async function writer(): Promise<SupabaseClient> {
  if (process.env.NEXT_RUNTIME) {
    const { createServerClient } = await import("@supabase/ssr");
    const { cookies } = await import("next/headers");
    const store = await cookies();
    return createServerClient(SB_URL(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            /* en Server Components no se pueden escribir cookies */
          }
        },
      },
    }) as unknown as SupabaseClient;
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new HttpError(500, "Falta SUPABASE_SERVICE_ROLE_KEY para escribir fuera de Next.");
  return createSupabaseClient(SB_URL(), key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function check<T>(res: { data: T; error: { message: string; code?: string } | null }, what: string): T {
  if (res.error) {
    if (res.error.code === "23505") throw new HttpError(409, `${what}: ya existe (${res.error.message})`);
    throw new Error(`${what}: ${res.error.message}`);
  }
  return res.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Productos: serialización (idéntica a _product_to_public_dict / _list_dict)
// ─────────────────────────────────────────────────────────────────────────────

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type BrandObj = { slug: string; name: string; logo_url: string | null; origin: string | null };

const FULL_SELECT = "*, brand_obj:catalog_brands(slug, name, logo_url, origin)";
const LIST_COLUMNS =
  "ref, slug, name, family, families, brand, active, status, gallery, image_url, descripcion_corta, sin_gluten, sin_lactosa, vegetariano";

const num = (v: unknown) => (v == null ? 0 : Number(v));

function toPublic(p: Row): Row {
  const gallery: string[] = p.gallery ?? [];
  const brandObj = (Array.isArray(p.brand_obj) ? p.brand_obj[0] : p.brand_obj) as BrandObj | null;
  return {
    ref: p.ref,
    slug: p.slug,
    name: p.name,
    family: p.family,
    families: [...(p.families ?? [])],
    subfamily: p.subfamily,
    brand: p.brand,
    brand_obj: brandObj
      ? { slug: brandObj.slug, name: brandObj.name, logo_url: brandObj.logo_url, origin: brandObj.origin }
      : null,
    supplier: p.supplier,
    origen: p.origen,
    flavor: p.flavor,
    unit_base: p.unit_base,
    base_price_eur: num(p.base_price_eur),
    iva_pct: num(p.iva_pct),
    stock_actual: num(p.stock_actual),
    stock_minimo: p.stock_minimo,
    units_per_box: p.units_per_box,
    active: p.active,
    status: p.status,
    image_url: gallery.length ? gallery[0] : p.image_url,
    gallery: [...gallery],
    image_quality_score: p.image_quality_score,
    has_enriched_image: p.has_enriched_image,
    descripcion_corta: p.descripcion_corta,
    description_rich: p.description_rich,
    ingredientes: p.ingredientes,
    alergenos: p.alergenos,
    info_nutricional: p.info_nutricional,
    formato_opciones: p.formato_opciones || [],
    tags: p.tags || [],
    pairings: p.pairings || [],
    sin_gluten: p.sin_gluten,
    sin_lactosa: p.sin_lactosa,
    vegetariano: p.vegetariano,
    refrigerado: p.refrigerado,
    venta_a_granel: p.venta_a_granel,
    peso_variable: p.peso_variable,
    seo_title: p.seo_title,
    seo_description: p.seo_description,
    optimization_score: p.optimization_score,
    // Los catálogos de publicación viven en Supabase (product_catalogs), no aquí;
    // la API también devolvía [] porque en Neon esa tabla estaba vacía.
    catalogs: [],
    descripcion: p.descripcion_corta,
  };
}

function toList(p: Row): Row {
  const gallery: string[] = p.gallery ?? [];
  return {
    ref: p.ref,
    slug: p.slug,
    name: p.name,
    family: p.family,
    families: [...(p.families ?? [])],
    brand: p.brand,
    active: p.active,
    status: p.status,
    image_url: gallery.length ? gallery[0] : p.image_url,
    descripcion_corta: p.descripcion_corta,
    sin_gluten: p.sin_gluten,
    sin_lactosa: p.sin_lactosa,
    vegetariano: p.vegetariano,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Productos: lectura
// ─────────────────────────────────────────────────────────────────────────────

async function listProducts(q: URLSearchParams) {
  const text = (q.get("q") ?? "").trim();
  const family = q.get("family");
  const limit = clampInt(q.get("limit"), 10, 1, 200);
  const offset = clampInt(q.get("offset"), 0, 0, 1_000_000);
  const view = q.get("view") === "list" ? "list" : "full";
  const sb = reader();

  if (text) {
    const rows = check(
      await sb.rpc("catalog_search", { q: text, fam: family || null, lim: limit }).select(FULL_SELECT),
      "buscar productos",
    ) as Row[];
    return { query: text, results: rows.map(view === "list" ? toList : toPublic) };
  }

  let query = sb
    .from("catalog_products")
    .select(view === "list" ? LIST_COLUMNS : FULL_SELECT)
    .eq("active", true);
  if (family) query = query.contains("families", [family.toUpperCase().trim()]);
  const rows = check(
    await query
      .order("family", { ascending: true })
      .order("name", { ascending: true })
      .order("ref", { ascending: true })
      .range(offset, offset + limit - 1),
    "listar productos",
  ) as unknown as Row[];
  return { query: "", results: rows.map(view === "list" ? toList : toPublic) };
}

function clampInt(raw: string | null, def: number, min: number, max: number) {
  const n = raw == null || raw === "" ? def : Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

async function loadRow(by: "ref" | "slug", value: string, sb: SupabaseClient = reader()): Promise<Row | null> {
  return check(
    await sb.from("catalog_products").select(FULL_SELECT).eq(by, value).maybeSingle(),
    `leer producto ${value}`,
  ) as Row | null;
}

async function mustLoad(ref: string, sb?: SupabaseClient): Promise<Row> {
  const p = await loadRow("ref", ref, sb);
  if (!p) throw new HttpError(404, `Producto ${ref} no existe`);
  return p;
}

async function getProduct(by: "ref" | "slug", value: string) {
  const p = await loadRow(by, value);
  if (!p) {
    throw new HttpError(404, by === "ref" ? `Producto ${value} no existe` : `Producto con slug '${value}' no existe`);
  }
  return toPublic(p);
}

// ─────────────────────────────────────────────────────────────────────────────
// Productos: escritura
// ─────────────────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

/** python-slugify aproximado: minúsculas, sin acentos, guiones. */
export function slugifyText(s: string, maxLength = 0): string {
  let out = (s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[æÆ]/g, "ae")
    .replace(/[øØ]/g, "o")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (maxLength > 0 && out.length > maxLength) out = out.slice(0, maxLength).replace(/-+$/g, "");
  return out;
}

const makeSlug = (name: string, ref: string) => `${slugifyText(name || "producto", 180)}-${ref}`;

function normalizeFamilies(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  for (const v of values) {
    if (typeof v !== "string") continue;
    const f = v.trim().toUpperCase();
    if (f) seen.add(f);
  }
  return [...seen];
}

function resolveFamilies(family: unknown, families: unknown): [string, string[]] {
  const norm = normalizeFamilies(families);
  if (norm.length) return [norm[0], norm];
  if (typeof family === "string" && family.trim()) {
    const f = family.trim().toUpperCase();
    return [f, [f]];
  }
  throw new HttpError(400, "Hay que mandar `family` o `families` (no pueden estar ambos vacíos).");
}

async function familyExists(sb: SupabaseClient, slug: string) {
  const r = check(
    await sb.from("catalog_families").select("slug").eq("slug", slug).maybeSingle(),
    "comprobar familia",
  );
  return !!r;
}

async function brandExists(sb: SupabaseClient, slug: string) {
  const r = check(
    await sb.from("catalog_brands").select("slug").eq("slug", slug).maybeSingle(),
    "comprobar marca",
  );
  return !!r;
}

const FAMILY_PREFIX: Record<string, string> = {
  QUESOS: "QUE",
  DESPENSA: "DES",
  EMBUTIDOS: "EMB",
  CONSERVAS: "CON",
  BODEGA: "BOD",
  PANADERIA: "PAN",
};

async function nextRef(sb: SupabaseClient, family: string): Promise<string> {
  const prefix = FAMILY_PREFIX[family.toUpperCase()];
  if (!prefix) {
    throw new HttpError(400, `Familia desconocida. Permitidas: ${Object.keys(FAMILY_PREFIX).sort().join(", ")}`);
  }
  const rows = check(
    await sb.from("catalog_products").select("ref").like("ref", `${prefix}-%`),
    "calcular ref",
  ) as { ref: string }[];
  let max = 0;
  for (const { ref } of rows) {
    const m = new RegExp(`^${prefix}-(\\d+)$`).exec(ref ?? "");
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

function scoreOf(row: Row): number {
  try {
    return Math.round(computeOptimizationScore(adaptApiProduct(toPublic(row) as ApiProduct)).total);
  } catch {
    return row.optimization_score ?? 0;
  }
}

const STATUS_RE = /^(draft|published|archived)$/;

function validateCommon(body: Row) {
  for (const k of ["base_price_eur", "iva_pct"] as const) {
    if (body[k] == null) continue;
    const v = Number(body[k]);
    if (!Number.isFinite(v) || v < 0 || (k === "iva_pct" && v > 21)) {
      throw new HttpError(422, `Valor no válido para ${k}: ${String(body[k])}`);
    }
    body[k] = v;
  }
  if (body.status != null && !STATUS_RE.test(String(body.status))) {
    throw new HttpError(422, `status no válido: ${String(body.status)}`);
  }
  if (body.seo_title != null && String(body.seo_title).length > 200) throw new HttpError(422, "seo_title > 200 caracteres");
  if (body.seo_description != null && String(body.seo_description).length > 500) {
    throw new HttpError(422, "seo_description > 500 caracteres");
  }
}

async function normalizeBrand(sb: SupabaseClient, raw: unknown): Promise<string | null> {
  if (raw == null || (typeof raw === "string" && !raw.trim())) return null;
  const slug = String(raw).trim().toLowerCase();
  if (!(await brandExists(sb, slug))) {
    throw new HttpError(
      400,
      `La marca '${slug}' no existe en la tabla de marcas. Créala primero con POST /catalog/brands o elige una existente.`,
    );
  }
  return slug;
}

async function createProduct(body: Row) {
  const sb = await writer();
  if (typeof body.name !== "string" || body.name.trim().length < 2) {
    throw new HttpError(422, "name es obligatorio (mínimo 2 caracteres).");
  }
  if (body.family == null) throw new HttpError(422, "family es obligatorio.");
  validateCommon(body);
  const status = (body.status as string) ?? "published";
  const [family, families] = resolveFamilies(body.family, body.families);

  const brand = await normalizeBrand(sb, body.brand);
  for (const f of families) {
    if (!(await familyExists(sb, f))) {
      throw new HttpError(400, `La familia '${f}' no existe. Créala primero con POST /catalog/families.`);
    }
  }

  let ref: string;
  if (typeof body.ref === "string" && body.ref.trim()) {
    ref = body.ref.trim();
    if (await loadRow("ref", ref, sb)) throw new HttpError(409, `Ya existe un producto con ref ${ref}`);
  } else {
    ref = await nextRef(sb, family);
  }
  const slug = typeof body.slug === "string" && body.slug.trim() ? body.slug.trim() : makeSlug(body.name, ref);

  const row: Row = {
    ref,
    name: body.name.trim(),
    brand,
    family,
    families,
    subfamily: body.subfamily ?? null,
    supplier: body.supplier ?? null,
    unit_base: String(body.unit_base || "UD").toUpperCase().trim(),
    base_price_eur: body.base_price_eur ?? 0,
    iva_pct: body.iva_pct ?? 10,
    stock_actual: body.stock_actual ?? 0,
    stock_minimo: body.stock_minimo ?? 0,
    units_per_box: body.units_per_box ?? null,
    active: status !== "archived",
    status,
    descripcion_corta: body.descripcion_corta ?? null,
    description_rich: body.description_rich ?? null,
    ingredientes: body.ingredientes ?? null,
    origen: body.origen ?? null,
    flavor: body.flavor ?? null,
    alergenos: body.alergenos ?? null,
    info_nutricional: body.info_nutricional ?? null,
    sin_gluten: !!body.sin_gluten,
    sin_lactosa: !!body.sin_lactosa,
    vegetariano: !!body.vegetariano,
    refrigerado: !!body.refrigerado,
    venta_a_granel: !!body.venta_a_granel,
    peso_variable: !!body.peso_variable,
    formato_opciones: Array.isArray(body.formato_opciones) && body.formato_opciones.length ? body.formato_opciones : null,
    tags: body.tags || [],
    pairings: body.pairings || [],
    slug,
    seo_title: body.seo_title ?? null,
    seo_description: body.seo_description ?? null,
    fecha_alta: today(),
  };
  row.optimization_score = scoreOf(row);
  check(await sb.from("catalog_products").insert(row), "crear producto");
  return toPublic(await mustLoad(ref, sb));
}

/** Campos que acepta PUT (los demás se ignoran, como hacía Pydantic). */
const UPDATABLE = new Set([
  "name", "family", "families", "subfamily", "brand", "supplier", "unit_base", "base_price_eur",
  "iva_pct", "stock_actual", "stock_minimo", "active", "units_per_box", "descripcion_corta",
  "description_rich", "ingredientes", "alergenos", "info_nutricional", "origen", "flavor",
  "sin_gluten", "sin_lactosa", "vegetariano", "refrigerado", "venta_a_granel", "peso_variable",
  "formato_opciones", "tags", "pairings", "slug", "seo_title", "seo_description", "status", "catalogs",
]);

async function updateProduct(ref: string, body: Row) {
  const sb = await writer();
  const p = await mustLoad(ref, sb);
  const changes: Row = {};
  for (const [k, v] of Object.entries(body)) if (UPDATABLE.has(k)) changes[k] = v;
  // `catalogs` (Neon) ya no existe: los catálogos viven en Supabase product_catalogs.
  delete changes.catalogs;
  if (!Object.keys(changes).length) throw new HttpError(400, "Nada que actualizar (payload vacío).");
  validateCommon(changes);

  if ("families" in changes || "family" in changes) {
    const [f, fs] = resolveFamilies(
      "family" in changes ? changes.family : p.family,
      "families" in changes ? changes.families : null,
    );
    changes.family = f;
    changes.families = fs;
  }
  if (changes.unit_base) changes.unit_base = String(changes.unit_base).toUpperCase().trim();
  if ("brand" in changes) changes.brand = await normalizeBrand(sb, changes.brand);
  if ("family" in changes && changes.family) {
    const f = String(changes.family).trim().toUpperCase();
    if (!(await familyExists(sb, f))) {
      throw new HttpError(
        400,
        `La familia '${f}' no existe en la tabla de familias. Créala primero con POST /catalog/families o elige una existente.`,
      );
    }
    changes.family = f;
  }
  if (Array.isArray(changes.families) && changes.families.length) {
    const out: string[] = [];
    for (const raw of changes.families) {
      if (!raw || !String(raw).trim()) continue;
      const f = String(raw).trim().toUpperCase();
      if (!(await familyExists(sb, f))) {
        throw new HttpError(400, `La familia '${f}' no existe. Créala primero con POST /catalog/families.`);
      }
      out.push(f);
    }
    changes.families = out;
  }

  const next: Row = { ...p, ...changes };

  // Puerta de publicación (igual que la API).
  if (next.status === "published") {
    const missing: string[] = [];
    if (!next.name || !String(next.name).trim()) missing.push("nombre");
    if (!next.brand) missing.push("marca");
    if (!next.family) missing.push("familia");
    if (!next.descripcion_corta || !String(next.descripcion_corta).trim()) missing.push("descripción corta");
    if (!next.description_rich || !String(next.description_rich).trim()) missing.push("descripción larga");
    if (!next.image_url && !(next.gallery ?? []).length) missing.push("imagen");
    if (!(typeof next.alergenos === "string" ? next.alergenos : "").trim()) missing.push("alérgenos");
    if (missing.length) {
      throw new HttpError(400, `No se puede publicar. Faltan campos obligatorios: ${missing.join(", ")}`);
    }
  }

  // active ↔ status
  if ("status" in changes) {
    next.active = next.status !== "archived";
  } else if ("active" in changes) {
    if (next.active === false && next.status === "published") next.status = "archived";
    else if (next.active === true && next.status === "archived") next.status = "published";
  }
  next.fecha_modificacion = today();
  next.optimization_score = scoreOf(next);

  const patch: Row = { ...changes };
  for (const k of ["active", "status", "fecha_modificacion", "optimization_score"]) patch[k] = next[k];
  check(await sb.from("catalog_products").update(patch).eq("ref", ref), "actualizar producto");
  return toPublic(await mustLoad(ref, sb));
}

async function deleteProduct(ref: string, q: URLSearchParams) {
  const sb = await writer();
  const p = await mustLoad(ref, sb);
  const hard = q.get("hard") === "true";
  if (!hard) {
    if (!p.active) return { ref, status: "already_inactive" };
    check(
      await sb.from("catalog_products").update({ active: false, fecha_modificacion: today() }).eq("ref", ref),
      "desactivar producto",
    );
    return { ref, status: "soft_deleted (active=false)" };
  }
  if (q.get("confirm_ref") !== ref) {
    throw new HttpError(
      400,
      `hard=true requiere confirm_ref=${ref}. Recibido: ${q.get("confirm_ref")}. Esta barrera evita borrados por error (typo en la URL).`,
    );
  }
  check(await sb.from("catalog_products").delete().eq("ref", ref), "borrar producto");
  return { ref, status: "hard_deleted" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Galería de imágenes (Cloudinary)
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const CLOUDINARY_PREFIX = "aurellano/products";

function cloudinaryConfig() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) throw new HttpError(503, "Cloudinary no configurado en el servidor.");
  return { cloud, key, secret };
}

function sign(params: Record<string, string>, secret: string) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + secret).digest("hex");
}

async function cloudinaryUpload(bytes: Uint8Array, type: string, publicId: string, ref: string): Promise<string> {
  const { cloud, key, secret } = cloudinaryConfig();
  const params: Record<string, string> = {
    eager: "c_fill,f_auto,h_600,q_auto,w_600",
    overwrite: "true",
    public_id: publicId,
    tags: `aurellano,product,${ref}`,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) form.append(k, v);
  form.append("api_key", key);
  form.append("signature", sign(params, secret));
  form.append("file", new Blob([bytes as BlobPart], { type }));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok) throw new HttpError(502, `Cloudinary falló: ${data.error?.message ?? res.status}`);
  if (!data.secure_url) throw new HttpError(502, "Cloudinary no devolvió secure_url.");
  return data.secure_url;
}

/** Best-effort: si falla, solo se registra (como en la API). */
async function cloudinaryDestroy(publicId: string) {
  try {
    const { cloud, key, secret } = cloudinaryConfig();
    const params = { invalidate: "true", public_id: publicId, timestamp: String(Math.floor(Date.now() / 1000)) };
    const form = new FormData();
    for (const [k, v] of Object.entries(params)) form.append(k, v);
    form.append("api_key", key);
    form.append("signature", sign(params, secret));
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/destroy`, { method: "POST", body: form });
    if (!res.ok) console.warn(`[catalog-backend] Cloudinary destroy ${publicId}: HTTP ${res.status}`);
  } catch (e) {
    console.warn(`[catalog-backend] Cloudinary destroy ${publicId} falló:`, (e as Error).message);
  }
}

const publicIdFor = (ref: string, bytes: Uint8Array) =>
  `${CLOUDINARY_PREFIX}/${ref}/${createHash("md5").update(bytes).digest("hex").slice(0, 12)}`;

export function publicIdFromUrl(url: string): string | null {
  const m = /\/(aurellano\/products\/[^./]+(?:\/[^./]+)?)(?:\.[a-z0-9]+)?$/i.exec(url);
  return m ? m[1] : null;
}

async function readUpload(init?: RequestInit): Promise<{ bytes: Uint8Array; type: string }> {
  const body = init?.body;
  if (!(body instanceof FormData)) throw new HttpError(422, "Se esperaba multipart/form-data con el campo `file`.");
  const file = body.get("file");
  if (!file || typeof file === "string") throw new HttpError(422, "Falta el campo `file`.");
  const type = (file as Blob).type;
  if (!ALLOWED_IMAGE_TYPES.has(type)) {
    throw new HttpError(
      415,
      `Content-Type no soportado: ${type}. Permitidos: ${[...ALLOWED_IMAGE_TYPES].sort().join(", ")}`,
    );
  }
  const bytes = new Uint8Array(await (file as Blob).arrayBuffer());
  if (!bytes.length) throw new HttpError(400, "Archivo vacío.");
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new HttpError(413, `Archivo demasiado grande (${bytes.length} bytes, máx ${MAX_IMAGE_BYTES}).`);
  }
  return { bytes, type };
}

/** Guarda la galería nueva y devuelve el payload estándar de la API. */
async function saveGallery(sb: SupabaseClient, p: Row, gallery: string[], extra?: Row) {
  const oldPrincipal = (p.gallery ?? [])[0] ?? null;
  const next: Row = { ...p, gallery, image_url: gallery[0] ?? null, fecha_modificacion: today() };
  if ((gallery[0] ?? null) !== oldPrincipal) {
    // La calidad de imagen se calculaba en la VPS; si cambia la principal, queda sin calcular.
    next.image_quality_score = null;
    next.has_enriched_image = false;
  }
  next.optimization_score = scoreOf(next);
  check(
    await sb
      .from("catalog_products")
      .update({
        gallery: next.gallery,
        image_url: next.image_url,
        fecha_modificacion: next.fecha_modificacion,
        image_quality_score: next.image_quality_score,
        has_enriched_image: next.has_enriched_image,
        optimization_score: next.optimization_score,
      })
      .eq("ref", p.ref),
    "guardar galería",
  );
  return {
    ref: p.ref,
    image_url: next.image_url,
    gallery: [...gallery],
    optimization_score: next.optimization_score,
    image_quality_score: next.image_quality_score,
    has_enriched_image: next.has_enriched_image,
    ...extra,
  };
}

async function addImage(ref: string, init?: RequestInit) {
  const sb = await writer();
  const p = await mustLoad(ref, sb);
  const { bytes, type } = await readUpload(init);
  const publicId = publicIdFor(ref, bytes);
  const current: string[] = p.gallery ?? [];
  if (current.some((u) => publicIdFromUrl(u) === publicId)) {
    return {
      ref,
      image_url: current[0] ?? p.image_url,
      gallery: [...current],
      optimization_score: p.optimization_score,
      image_quality_score: p.image_quality_score,
      has_enriched_image: p.has_enriched_image,
      deduplicated: true,
    };
  }
  const url = await cloudinaryUpload(bytes, type, publicId, ref);
  return saveGallery(sb, p, [...current, url]);
}

async function removeImage(ref: string, url: string) {
  const sb = await writer();
  const p = await mustLoad(ref, sb);
  const current: string[] = p.gallery ?? [];
  if (!current.includes(url)) throw new HttpError(404, `URL no presente en la galería de ${ref}.`);
  const out = await saveGallery(sb, p, current.filter((u) => u !== url));
  const pid = publicIdFromUrl(url);
  if (pid) await cloudinaryDestroy(pid);
  return out;
}

async function reorderImages(ref: string, body: Row) {
  const sb = await writer();
  const p = await mustLoad(ref, sb);
  const order = body.order;
  if (!Array.isArray(order) || !order.length) throw new HttpError(422, "`order` debe ser una lista no vacía.");
  const current: string[] = p.gallery ?? [];
  const same = [...order].sort().join("\n") === [...current].sort().join("\n");
  if (!same) {
    throw new HttpError(
      400,
      "El `order` debe contener exactamente las mismas URLs que la galería actual (sin añadidos ni omisiones). Usa POST/DELETE para mutar el set.",
    );
  }
  return saveGallery(sb, p, order.map(String));
}

async function setPrimaryImage(ref: string, body: Row) {
  const sb = await writer();
  const p = await mustLoad(ref, sb);
  const primary = String(body.primary ?? "");
  const current: string[] = p.gallery ?? [];
  if (!current.includes(primary)) throw new HttpError(404, `URL no presente en la galería de ${ref}.`);
  return saveGallery(sb, p, [primary, ...current.filter((u) => u !== primary)]);
}

/** Legacy POST /image: sustituye la principal. */
async function replacePrimaryImage(ref: string, init?: RequestInit) {
  const sb = await writer();
  const p = await mustLoad(ref, sb);
  const { bytes, type } = await readUpload(init);
  const publicId = publicIdFor(ref, bytes);
  const url = await cloudinaryUpload(bytes, type, publicId, ref);
  const current: string[] = [...(p.gallery ?? [])];
  if (current.length && current[0] !== url) {
    const oldPid = publicIdFromUrl(current[0]);
    if (oldPid && oldPid !== publicId) await cloudinaryDestroy(oldPid);
    current[0] = url;
  } else if (!current.length) {
    current.push(url);
  }
  const out = await saveGallery(sb, p, current);
  return { ref, image_url: url, public_id: publicId, gallery: out.gallery, optimization_score: out.optimization_score };
}

// ─────────────────────────────────────────────────────────────────────────────
// Familias
// ─────────────────────────────────────────────────────────────────────────────

const titleCase = (s: string) =>
  s.replace(/_/g, " ").toLowerCase().replace(/(^|\s)(\S)/g, (_m, sp: string, ch: string) => sp + ch.toUpperCase());

async function listFamilies() {
  const sb = reader();
  const counts = check(await sb.rpc("catalog_family_counts"), "contar familias") as { slug: string; n: number }[];
  const entities = check(await sb.from("catalog_families").select("*"), "listar familias") as Row[];
  const countBy = new Map(counts.map((c) => [c.slug, Number(c.n)]));
  const entBy = new Map(entities.map((e) => [e.slug as string, e]));
  const all = new Set([...countBy.keys(), ...entBy.keys()]);
  const out = [...all].map((slug) => {
    const e = entBy.get(slug);
    return {
      slug,
      family: slug,
      name: e ? e.name : titleCase(slug),
      description: e ? e.description : null,
      parent_slug: e ? e.parent_slug : null,
      color: e ? e.color : null,
      sort_order: e ? e.sort_order : 99999,
      active: e ? e.active : true,
      count: countBy.get(slug) ?? 0,
      is_entity: !!e,
    };
  });
  out.sort((x, y) => x.sort_order - y.sort_order || (x.name < y.name ? -1 : x.name > y.name ? 1 : 0));
  return out;
}

async function createFamily(body: Row) {
  const sb = await writer();
  if (typeof body.slug !== "string" || !body.slug.trim()) throw new HttpError(422, "slug es obligatorio.");
  if (typeof body.name !== "string" || !body.name.trim()) throw new HttpError(422, "name es obligatorio.");
  const slug = body.slug.trim().toUpperCase();
  if (await familyExists(sb, slug)) throw new HttpError(409, `Ya existe una familia con slug '${slug}'.`);
  let parent: string | null = null;
  if (typeof body.parent_slug === "string" && body.parent_slug.trim()) {
    parent = body.parent_slug.trim().toUpperCase();
    if (!(await familyExists(sb, parent))) throw new HttpError(400, `parent_slug '${parent}' no existe como entidad.`);
  }
  const row = {
    slug,
    name: body.name.trim(),
    description: body.description ?? null,
    parent_slug: parent,
    color: body.color ?? null,
    sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
    active: body.active ?? true,
  };
  const created = check(await sb.from("catalog_families").insert(row).select("*").single(), "crear familia") as Row;
  const { count, error } = await sb
    .from("catalog_products")
    .select("ref", { count: "exact", head: true })
    .contains("families", [slug]);
  if (error) throw new Error(`contar productos de familia: ${error.message}`);
  return { ...created, product_count: count ?? 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Marcas
// ─────────────────────────────────────────────────────────────────────────────

async function brandCounts(sb: SupabaseClient): Promise<Map<string, number>> {
  const rows = check(await sb.rpc("catalog_brand_counts"), "contar marcas") as { slug: string; n: number }[];
  return new Map(rows.map((r) => [r.slug, Number(r.n)]));
}

const brandDict = (b: Row, counts: Map<string, number>) => ({
  id: b.id,
  slug: b.slug,
  name: b.name,
  story: b.story,
  origin: b.origin,
  website: b.website,
  logo_url: b.logo_url,
  sort_order: b.sort_order,
  active: b.active,
  created_at: b.created_at,
  updated_at: b.updated_at,
  product_count: counts.get(b.slug) ?? 0,
});

async function listBrands(q: URLSearchParams) {
  const sb = reader();
  let query = sb.from("catalog_brands").select("*").order("sort_order").order("name");
  if (q.get("include_inactive") !== "true") query = query.eq("active", true);
  const rows = check(await query, "listar marcas") as Row[];
  const counts = await brandCounts(sb);
  return rows.map((b) => brandDict(b, counts));
}

async function getBrand(slug: string) {
  const sb = reader();
  const b = check(
    await sb.from("catalog_brands").select("*").eq("slug", slug.trim().toLowerCase()).maybeSingle(),
    "leer marca",
  ) as Row | null;
  if (!b) throw new HttpError(404, `Marca '${slug}' no existe.`);
  return brandDict(b, await brandCounts(sb));
}

async function createBrand(body: Row) {
  const sb = await writer();
  if (typeof body.name !== "string" || !body.name.trim()) throw new HttpError(422, "name es obligatorio.");
  const slug = (typeof body.slug === "string" && body.slug ? body.slug : slugifyText(body.name)).trim().toLowerCase();
  if (!slug) throw new HttpError(400, "Slug vacío tras normalizar.");
  if (await brandExists(sb, slug)) throw new HttpError(409, `Ya existe una marca con slug '${slug}'.`);
  const row = {
    slug,
    name: body.name.trim(),
    story: body.story ?? null,
    origin: body.origin ?? null,
    website: body.website ?? null,
    logo_url: body.logo_url ?? null,
    sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
    active: body.active ?? true,
  };
  const created = check(await sb.from("catalog_brands").insert(row).select("*").single(), "crear marca") as Row;
  return brandDict(created, new Map());
}
