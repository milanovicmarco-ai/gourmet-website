// Helpers para los catálogos de publicación.
//
// FUENTE DE VERDAD: backend Aurellano (FastAPI + Neon), bloque 3 LIVE 2026-05-09.
// Antes vivían en NUESTRO Supabase como workaround; ahora la API del socio los
// gestiona como entidad propia (`/catalog/catalogs/*`). Schema idéntico — el
// backend incluso devuelve los mismos campos (id UUID, slug, name, description,
// color, sort_order, active, created_at, updated_at) + product_count extra.

const API_BASE =
  process.env.NEXT_PUBLIC_AURELLANO_API ?? "https://aurellano-api.srv1124642.hstgr.cloud";

export type Catalog = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  product_count?: number; // expuesto por la API; opcional para no romper consumers viejos
};

/** Lee todos los catálogos. Por defecto solo activos. */
export async function listCatalogs(includeInactive = false): Promise<Catalog[]> {
  const qs = includeInactive ? "?include_inactive=true" : "";
  const r = await fetch(`${API_BASE}/catalog/catalogs${qs}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`listCatalogs: ${r.status} ${await r.text()}`);
  return (await r.json()) as Catalog[];
}

/** Devuelve la lista de slugs de catálogo asignados a un producto. */
export async function getProductCatalogs(productRef: string): Promise<string[]> {
  const r = await fetch(
    `${API_BASE}/catalog/products/${encodeURIComponent(productRef)}`,
    { cache: "no-store" },
  );
  if (!r.ok) {
    if (r.status === 404) return [];
    throw new Error(`getProductCatalogs(${productRef}): ${r.status} ${await r.text()}`);
  }
  const product = (await r.json()) as { catalogs?: { slug: string }[] };
  return (product.catalogs ?? []).map((c) => c.slug);
}

/** Devuelve un mapa product_ref → slugs[] para varios productos.
 *
 * Usa el endpoint batch `GET /catalog/products/catalogs-batch?refs=a,b,c` —
 * una sola request al backend en lugar de N en paralelo. Cubre hasta 500 refs
 * por petición; para más, fragmenta en chunks.
 */
export async function getCatalogsForProducts(refs: string[]): Promise<Record<string, string[]>> {
  if (refs.length === 0) return {};

  // Chunk a 500 (límite del backend) por si el listado es enorme.
  const CHUNK = 500;
  const chunks: string[][] = [];
  for (let i = 0; i < refs.length; i += CHUNK) chunks.push(refs.slice(i, i + CHUNK));

  const map: Record<string, string[]> = {};
  for (const chunk of chunks) {
    const qs = encodeURIComponent(chunk.join(","));
    const r = await fetch(
      `${API_BASE}/catalog/products/catalogs-batch?refs=${qs}`,
      { cache: "no-store" },
    );
    if (!r.ok) {
      // Si el batch falla, no rompemos toda la página: log y devolvemos lo que tengamos.
      console.error(`getCatalogsForProducts batch: ${r.status} ${await r.text()}`);
      continue;
    }
    const body = (await r.json()) as Record<string, { slug: string; name: string }[]>;
    for (const [ref, catalogs] of Object.entries(body)) {
      if (catalogs.length > 0) map[ref] = catalogs.map((c) => c.slug);
    }
  }
  return map;
}

export type FamilyMeta = {
  slug: string;
  display_name: string | null;
  description: string | null;
  sort_order: number;
  active: boolean;
};

/** Lista combinada de familias: API (auto-descubiertas) + overlay (creadas en settings).
 *  Ordenadas por sort_order del overlay → alfabético. Útil para dropdowns del editor. */
export async function listAllFamilies(): Promise<
  { slug: string; display_name: string; active: boolean; count: number }[]
> {
  const { listFamilies } = await import("./api");
  const [apiFamilies, metas] = await Promise.all([
    listFamilies().catch(() => []),
    getFamilyMetas().catch(() => ({} as Record<string, FamilyMeta>)),
  ]);

  const apiSlugs = new Set(apiFamilies.map((f) => f.family));
  const merged = new Map<string, { slug: string; display_name: string; active: boolean; count: number; sort: number }>();

  for (const f of apiFamilies) {
    const m = metas[f.family];
    merged.set(f.family, {
      slug: f.family,
      display_name: m?.display_name?.trim() || f.family,
      active: m?.active ?? true,
      count: f.count,
      sort: m?.sort_order ?? 9999,
    });
  }
  for (const [slug, m] of Object.entries(metas)) {
    if (apiSlugs.has(slug)) continue;
    merged.set(slug, {
      slug,
      display_name: m.display_name?.trim() || slug,
      active: m.active,
      count: 0,
      sort: m.sort_order ?? 9999,
    });
  }

  return Array.from(merged.values())
    .sort((a, b) => a.sort - b.sort || a.display_name.localeCompare(b.display_name))
    .map(({ slug, display_name, active, count }) => ({ slug, display_name, active, count }));
}

/** Devuelve mapa slug → meta para todas las familias del overlay. */
export async function getFamilyMetas(): Promise<Record<string, FamilyMeta>> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("families_meta").select("*");
  if (error) {
    console.warn("[getFamilyMetas] error:", error.message);
    return {};
  }
  return Object.fromEntries(
    ((data ?? []) as unknown as FamilyMeta[]).map((m) => [m.slug, m]),
  );
}

/** Refs de productos asignados a un catálogo (por slug). */
export async function getRefsByCatalogSlug(slug: string): Promise<string[]> {
  // La API soporta `?catalog={slug}` directamente y devuelve hasta 200 productos
  // por página. Para listas más largas habría que paginar; el admin actual no
  // espera catálogos con miles de productos.
  const r = await fetch(
    `${API_BASE}/catalog/products?catalog=${encodeURIComponent(slug)}&limit=200`,
    { cache: "no-store" },
  );
  if (!r.ok) {
    if (r.status === 404) return []; // catálogo inexistente → lista vacía
    throw new Error(`getRefsByCatalogSlug(${slug}): ${r.status} ${await r.text()}`);
  }
  const body = (await r.json()) as { results: { ref: string }[] };
  return body.results.map((p) => p.ref);
}
