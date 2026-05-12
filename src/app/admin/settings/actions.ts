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
