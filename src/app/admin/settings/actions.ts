"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/integrations/supabase/server";
import { listCatalogs as fetchCatalogs } from "@/lib/pim/catalogs";

// FUENTE DE VERDAD para catálogos = backend Aurellano (FastAPI + Neon),
// bloque 3 LIVE 2026-05-09. Las mutaciones llaman a `/catalog/catalogs/*`
// con `Authorization: Bearer ADMIN_API_KEY`. La auth Supabase se mantiene
// solo como gate del admin (gating del usuario humano que abre la UI).

const API_BASE =
  process.env.NEXT_PUBLIC_AURELLANO_API ?? "https://aurellano-api.srv1124642.hstgr.cloud";
const API_KEY = process.env.ADMIN_API_KEY;

async function requireAdmin() {
  // En dev se puede saltar el gate Supabase con DEV_BYPASS_ADMIN_AUTH=1.
  if (process.env.DEV_BYPASS_ADMIN_AUTH === "1") return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
}

function authHeaders(): HeadersInit {
  if (!API_KEY) {
    throw new Error("ADMIN_API_KEY no configurada en .env.local — necesaria para mutar catálogos.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_KEY}`,
  };
}

/** Mapea UUID interno (que la UI usa) → slug (que la API espera en la URL). */
async function slugForCatalogId(id: string): Promise<string> {
  // listCatalogs incluye inactivos para que también se puedan reactivar/borrar.
  const catalogs = await fetchCatalogs(true);
  const found = catalogs.find((c) => c.id === id);
  if (!found) throw new Error(`Catálogo con id ${id} no encontrado.`);
  return found.slug;
}

// ============================
// CATÁLOGOS
// ============================
export async function createCatalog(input: {
  slug?: string;
  name: string;
  description?: string;
  color?: string;
  sort_order?: number;
}) {
  await requireAdmin();
  const r = await fetch(`${API_BASE}/catalog/catalogs`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      // El backend normaliza el slug; si no se pasa, usa el name como base.
      slug: (input.slug?.trim() || input.name).slice(0, 80),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      color: input.color || "#fa2ca2",
      sort_order: input.sort_order ?? 0,
    }),
  });
  if (!r.ok) throw new Error(`createCatalog: ${r.status} ${await r.text()}`);
  revalidatePath("/admin/settings/catalogs");
  return r.json();
}

export async function updateCatalog(id: string, input: {
  slug?: string;
  name?: string;
  description?: string | null;
  color?: string;
  sort_order?: number;
  active?: boolean;
}) {
  await requireAdmin();
  const slug = await slugForCatalogId(id);
  const patch: Record<string, unknown> = {};
  if (input.slug !== undefined) patch.slug = input.slug.trim();
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  if (input.color !== undefined) patch.color = input.color;
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order;
  if (input.active !== undefined) patch.active = input.active;

  const r = await fetch(`${API_BASE}/catalog/catalogs/${encodeURIComponent(slug)}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`updateCatalog: ${r.status} ${await r.text()}`);
  revalidatePath("/admin/settings/catalogs");
  revalidatePath("/admin/products");
}

export async function deleteCatalog(id: string) {
  await requireAdmin();
  const slug = await slugForCatalogId(id);
  // hard=true para liberar el slug y limpiar la pivote (CASCADE).
  const r = await fetch(
    `${API_BASE}/catalog/catalogs/${encodeURIComponent(slug)}?hard=true`,
    { method: "DELETE", headers: authHeaders() },
  );
  if (!r.ok) throw new Error(`deleteCatalog: ${r.status} ${await r.text()}`);
  revalidatePath("/admin/settings/catalogs");
  revalidatePath("/admin/products");
}

// ============================
// FAMILIAS · overlay families_meta
// ============================
//
// Las familias se DESCUBREN automáticamente desde la API (listFamilies). El overlay
// nos permite reetiquetar la familia para el público (display_name), reordenarla,
// añadirle descripción o desactivarla en la web sin tocar la API del socio.

export async function upsertFamilyMeta(input: {
  slug: string;
  display_name?: string | null;
  description?: string | null;
  sort_order?: number;
  active?: boolean;
}) {
  const { supabase } = await requireAdmin();

  // 1) Sincroniza con la API del socio: si la familia no existe en su backend,
  // la creamos vía POST /catalog/families. Así, al crear la familia en settings
  // queda disponible inmediatamente para asignarla a productos sin que el editor
  // se choque con el 400 "La familia X no existe".
  const { ensureFamilyExists } = await import("../products/actions");
  const check = await ensureFamilyExists(input.slug, input.display_name ?? null);
  if (check.ok !== true) {
    console.warn(
      `[upsertFamilyMeta] no se pudo crear "${input.slug}" en la API del socio (${check.reason}). Guardo igual en el overlay; el editor de producto la encontrará si más adelante se crea allí.`,
    );
  }

  // 2) Upsert local en families_meta (overlay).
  const { error } = await supabase
    .from("families_meta")
    .upsert(
      {
        slug: input.slug,
        display_name: input.display_name?.trim() || null,
        description: input.description?.trim() || null,
        sort_order: input.sort_order ?? 0,
        active: input.active ?? true,
      },
      { onConflict: "slug" },
    );
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings/families");
  revalidatePath("/catalogo");
  revalidatePath("/admin/products");
}

export async function deleteFamilyMeta(slug: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("families_meta").delete().eq("slug", slug);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings/families");
}

// ============================
// MARCAS · gestión sobre product_meta.brand_override
// ============================
//
// Las marcas viven como texto libre en product_meta.brand_override. Aquí ofrecemos
// dos operaciones masivas:
//   - renameBrand(from, to): cambia todas las filas con esa marca a la nueva.
//     Match case-insensitive con normalización de espacios. Útil para limpiar
//     "Comtesse du Barry" / "comtesse du barry" en una sola operación.
//   - deleteBrand(name): vacía brand_override en todas las filas con esa marca.

export async function renameBrand(fromName: string, toName: string): Promise<number> {
  const { supabase } = await requireAdmin();
  const from = fromName.trim();
  const to = toName.trim();
  if (!from) throw new Error("El nombre origen está vacío.");
  if (!to) throw new Error("El nombre destino está vacío.");
  if (from === to) return 0;

  // Trae filas case-insensitive y normalizadas, sin depender de extensión `citext`.
  const { data: rows, error: selErr } = await supabase
    .from("product_meta")
    .select("product_ref, brand_override")
    .ilike("brand_override", from);
  if (selErr) throw new Error(selErr.message);

  const refs = (rows ?? [])
    .filter((r) => r.brand_override?.trim().toLowerCase() === from.toLowerCase())
    .map((r) => r.product_ref as string);

  if (refs.length === 0) return 0;

  const { error: updErr } = await supabase
    .from("product_meta")
    .update({ brand_override: to })
    .in("product_ref", refs);
  if (updErr) throw new Error(updErr.message);

  revalidatePath("/admin/settings/brands");
  revalidatePath("/admin/products");
  revalidatePath("/catalogo");
  return refs.length;
}

export async function deleteBrand(name: string): Promise<number> {
  const { supabase } = await requireAdmin();
  const target = name.trim();
  if (!target) throw new Error("El nombre está vacío.");

  const { data: rows, error: selErr } = await supabase
    .from("product_meta")
    .select("product_ref, brand_override")
    .ilike("brand_override", target);
  if (selErr) throw new Error(selErr.message);

  const refs = (rows ?? [])
    .filter((r) => r.brand_override?.trim().toLowerCase() === target.toLowerCase())
    .map((r) => r.product_ref as string);

  if (refs.length === 0) return 0;

  const { error: updErr } = await supabase
    .from("product_meta")
    .update({ brand_override: null })
    .in("product_ref", refs);
  if (updErr) throw new Error(updErr.message);

  revalidatePath("/admin/settings/brands");
  revalidatePath("/admin/products");
  revalidatePath("/catalogo");
  return refs.length;
}

// ============================
// ASIGNACIÓN PRODUCTO ↔ CATÁLOGOS
// ============================
export async function setProductCatalogs(productRef: string, catalogIds: string[]) {
  await requireAdmin();

  // La UI sigue trabajando con UUIDs internos; los traducimos a slugs porque la
  // API del backend acepta `catalogs: [slug, slug]` (no UUIDs). Reemplaza el set
  // completo en una sola llamada PUT (atómico, equivalente al delete+reinsert
  // anterior pero sin race conditions).
  const all = await fetchCatalogs(true);
  const slugs = catalogIds
    .map((id) => all.find((c) => c.id === id)?.slug)
    .filter((s): s is string => Boolean(s));

  const r = await fetch(
    `${API_BASE}/catalog/products/${encodeURIComponent(productRef)}`,
    {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ catalogs: slugs }),
    },
  );
  if (!r.ok) throw new Error(`setProductCatalogs: ${r.status} ${await r.text()}`);

  revalidatePath(`/admin/products/${productRef}`);
  revalidatePath("/admin/products");
}
