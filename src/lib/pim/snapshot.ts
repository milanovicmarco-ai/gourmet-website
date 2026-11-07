// Respaldo del catálogo público: la "foto" guardada en src/data/catalog-snapshot.json
// (se regenera con `npm run snapshot`).
//
// SOLO se usa cuando la API del catálogo falla (VPS caída, Neon sin cuota,
// timeout…). Mientras la API responde, nada de esto se ejecuta y la web se
// comporta exactamente igual que antes. El archivo se carga con import()
// dinámico: no pesa en las funciones hasta que de verdad se necesita.

import type { ApiProduct, FamilyCount, ProductsListResponse } from "./api";

type Snapshot = {
  generated_at: string;
  products: ApiProduct[];
  families: FamilyCount[];
};

let loading: Promise<Snapshot> | null = null;

function loadSnapshot(): Promise<Snapshot> {
  loading ??= import("@/data/catalog-snapshot.json").then((m) => {
    const data = ((m as { default?: unknown }).default ?? m) as Snapshot;
    console.warn(
      `[snapshot] API del catálogo no disponible: sirviendo la foto del ${data.generated_at}`,
    );
    return data;
  });
  return loading;
}

const norm = (s: string | null | undefined) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export async function snapshotProductByRef(ref: string): Promise<ApiProduct | null> {
  const { products } = await loadSnapshot();
  return products.find((p) => p.ref === ref) ?? null;
}

export async function snapshotProductBySlug(slug: string): Promise<ApiProduct | null> {
  const { products } = await loadSnapshot();
  return products.find((p) => p.slug === slug) ?? null;
}

/** Imita GET /catalog/products: filtro por familia, búsqueda simple, limit/offset. */
export async function snapshotListProducts(params?: {
  limit?: number;
  offset?: number;
  family?: string;
  q?: string;
}): Promise<ProductsListResponse> {
  const { products } = await loadSnapshot();
  let list = products;
  if (params?.family) {
    const f = params.family;
    list = list.filter((p) => p.family === f || (p.families ?? []).includes(f));
  }
  if (params?.q) {
    const words = norm(params.q).split(/\s+/).filter(Boolean);
    list = list.filter((p) => {
      const hay = norm([p.name, p.brand, p.family, p.descripcion_corta, p.ref].join(" "));
      return words.every((w) => hay.includes(w));
    });
  }
  const offset = params?.offset ?? 0;
  const limit = params?.limit ?? 50;
  return { query: params?.q ?? "", results: list.slice(offset, offset + limit) };
}

export async function snapshotFamilies(): Promise<FamilyCount[]> {
  return (await loadSnapshot()).families;
}

/** Todos los productos publicados de la foto (para reconstruir el índice). */
export async function snapshotAllProducts(): Promise<ApiProduct[]> {
  return (await loadSnapshot()).products;
}
