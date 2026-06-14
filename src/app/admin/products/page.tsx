import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/integrations/supabase/server";
import { listProducts, fetchAllProducts, listFamilies, type ApiProduct } from "@/lib/pim/api";
import { listCatalogs, getRefsByCatalogSlug, getCatalogsForProducts } from "@/lib/pim/catalogs";
import { getMetasForProducts, effectiveRef, effectiveBrand } from "@/lib/pim/product-meta";
import { computeOptimizationScore, adaptApiProduct } from "@/lib/pim/score";

export const dynamic = "force-dynamic";

type SP = {
  q?: string;
  family?: string;
  brand?: string;
  catalog?: string;
  status?: string;
  score_min?: string;
  score_max?: string;
  sin_gluten?: string;
  sin_lactosa?: string;
  vegetariano?: string;
  page?: string;
  /** Orden del listado: "ref" (default, asc) o "name" (nombre + marca, asc). */
  sort?: string;
};

const PIM_PAGE_SIZE = 50;
type SortKey = "ref" | "name";
const VALID_SORTS: SortKey[] = ["ref", "name"];

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  // Skip Supabase auth completamente cuando DEV_BYPASS_ADMIN_AUTH=1 — evita
  // el lookup DNS lento si el proyecto Supabase no está configurado.
  let user: { email?: string | null } | null = null;
  if (process.env.DEV_BYPASS_ADMIN_AUTH !== "1") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
    if (!user) redirect("/admin/login");
  }

  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const family = sp.family?.trim() || undefined;
  const brandFilter = sp.brand?.trim() || undefined;
  const catalogSlug = sp.catalog?.trim() || undefined;
  const status = sp.status?.trim() || undefined;
  const scoreMin = sp.score_min ? Number(sp.score_min) : 0;
  const scoreMax = sp.score_max ? Number(sp.score_max) : 100;
  const onlySinGluten = sp.sin_gluten === "1";
  const onlySinLactosa = sp.sin_lactosa === "1";
  const sortKey: SortKey = VALID_SORTS.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : "ref";
  const onlyVegetariano = sp.vegetariano === "1";

  let products: ApiProduct[] = [];
  let families: Awaited<ReturnType<typeof listFamilies>> = [];
  let catalogs: Awaited<ReturnType<typeof listCatalogs>> = [];
  let error: string | null = null;

  // Sin filtro de familia: traemos TODO el catálogo. fetchAllProducts pagina por
  // familia para sortear el cap de 200/req de la API (si no, el admin solo veía
  // los primeros 200 de >600 productos). Con familia: una sola llamada filtrada
  // (≤200) que sigue siendo rápida.
  const loadProducts = family
    ? listProducts({ limit: 200, q, family })
    : fetchAllProducts({ q }).then((results) => ({ results }));
  const [pr, fa, ca] = await Promise.all([
    loadProducts.catch((e) => {
      console.warn("[admin/products] carga de productos error:", (e as Error).message);
      error = (e as Error).message;
      return { results: [] as ApiProduct[] };
    }),
    listFamilies().catch((e) => {
      console.warn("[admin/products] listFamilies error:", (e as Error).message);
      return [] as Awaited<ReturnType<typeof listFamilies>>;
    }),
    listCatalogs(true).catch((e) => {
      console.warn("[admin/products] listCatalogs error:", (e as Error).message);
      return [] as Awaited<ReturnType<typeof listCatalogs>>;
    }),
  ]);
  products = pr.results;
  families = fa;
  catalogs = ca;

  // El filtro por familia se aplica server-side directamente en listProducts.

  // Filtro por catálogo: intersecta los refs de la API con los asignados a ese catálogo en Supabase.
  if (catalogSlug && !error) {
    const refsInCatalog = await getRefsByCatalogSlug(catalogSlug).catch(() => []);
    const set = new Set(refsInCatalog);
    products = products.filter((p) => set.has(p.ref));
  }

  // Mapa product_ref → slugs[] para mostrar pills en el listado.
  const productCatalogsMap = !error
    ? await getCatalogsForProducts(products.map((p) => p.ref)).catch(() => ({}))
    : {};

  if (error) {
    return (
      <div className="px-5 md:px-10 py-8">
        <h1 className="font-display font-light text-3xl mb-3">Productos</h1>
        <p className="text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm">
          No se pudo conectar con la API del catálogo: {error}
        </p>
      </div>
    );
  }

  // Calculamos el score local de cada producto para que el listado y la ficha cuadren.
  // Incluye los flags dietéticos de nuestro overlay (Supabase) para que cuenten en el criterio.
  const metas = await getMetasForProducts(products.map((p) => p.ref)).catch(() => ({}));
  const productScores = new Map<string, number>(
    products.map((p) => [p.ref, computeOptimizationScore(adaptApiProduct(p, metas[p.ref])).total]),
  );

  // Lista única de marcas (case-insensitive). Mantiene la primera capitalización
  // que ve para mostrar en el dropdown, pero compara en minúsculas para que
  // "Comtesse du Barry" y "Comtesse du barry" cuenten como la misma marca.
  const brandsMap = new Map<string, string>(); // key: lowercase, value: canonical
  for (const p of products) {
    const b = effectiveBrand(metas[p.ref], p.brand);
    if (!b) continue;
    const key = b.toLowerCase().trim();
    if (!brandsMap.has(key)) brandsMap.set(key, b);
  }
  const allBrands = Array.from(brandsMap.values()).sort((a, b) => a.localeCompare(b));
  const brandFilterKey = brandFilter?.toLowerCase().trim();

  // Filtros aplicados en memoria (la API actual no los expone como query).
  const filtered = products.filter((p) => {
    const score = productScores.get(p.ref) ?? 0;
    if (score < scoreMin || score > scoreMax) return false;
    if (onlySinGluten && !p.sin_gluten) return false;
    if (onlySinLactosa && !p.sin_lactosa) return false;
    if (onlyVegetariano && !p.vegetariano) return false;
    if (brandFilterKey) {
      const b = effectiveBrand(metas[p.ref], p.brand).toLowerCase().trim();
      if (b !== brandFilterKey) return false;
    }
    if (status) {
      const effective = p.status ?? (p.active === false ? "archived" : "published");
      if (effective !== status) return false;
    }
    return true;
  });

  // Ordenación: por ref (default) o por nombre + marca. Locale "es" para que
  // acentos/ñ se ordenen como espera un humano.
  if (sortKey === "name") {
    filtered.sort((a, b) => {
      const an = (a.name ?? "").trim();
      const bn = (b.name ?? "").trim();
      const cmp = an.localeCompare(bn, "es", { sensitivity: "base", numeric: true });
      if (cmp !== 0) return cmp;
      const ab = (effectiveBrand(metas[a.ref], a.brand) ?? "").trim();
      const bb = (effectiveBrand(metas[b.ref], b.brand) ?? "").trim();
      return ab.localeCompare(bb, "es", { sensitivity: "base", numeric: true });
    });
  } else {
    // sort por ref ascendente con collation numérica (ref_2 antes que ref_10)
    filtered.sort((a, b) =>
      (a.ref ?? "").localeCompare(b.ref ?? "", undefined, { numeric: true, sensitivity: "base" }),
    );
  }

  const totalLoaded = products.length;
  const totalShown = filtered.length;
  const avgScore =
    totalShown > 0
      ? Math.round(
          filtered.reduce((acc, r) => acc + (productScores.get(r.ref) ?? 0), 0) / totalShown,
        )
      : 0;

  // Paginación: 50 por página. La página actual viene de ?page=N.
  const currentPage = Math.max(1, Number(sp.page) || 1);
  const totalPages = Math.max(1, Math.ceil(totalShown / PIM_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PIM_PAGE_SIZE;
  const pageEnd = pageStart + PIM_PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageEnd);

  // Helper: construye href para navegar entre páginas preservando todos los filtros.
  const hrefForPage = (n: number): string => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (family) params.set("family", family);
    if (brandFilter) params.set("brand", brandFilter);
    if (catalogSlug) params.set("catalog", catalogSlug);
    if (status) params.set("status", status);
    if (scoreMin > 0) params.set("score_min", String(scoreMin));
    if (scoreMax < 100) params.set("score_max", String(scoreMax));
    if (onlySinGluten) params.set("sin_gluten", "1");
    if (onlySinLactosa) params.set("sin_lactosa", "1");
    if (onlyVegetariano) params.set("vegetariano", "1");
    if (sortKey !== "ref") params.set("sort", sortKey);
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return `/admin/products${qs ? `?${qs}` : ""}`;
  };

  const activeFilters =
    [q, family, brandFilter, catalogSlug, status, onlySinGluten, onlySinLactosa, onlyVegetariano].filter(Boolean).length +
    (scoreMin > 0 ? 1 : 0) +
    (scoreMax < 100 ? 1 : 0);

  return (
    <div className="px-5 md:px-10 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">PIM · Catálogo</p>
          <h1 className="font-display font-light text-3xl md:text-4xl tracking-tight mt-1">
            Productos
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            <span className="font-medium text-foreground">{totalShown}</span> de {totalLoaded}
            {totalPages > 1 && (
              <>
                {" · "}mostrando{" "}
                <span className="font-medium text-foreground">
                  {pageStart + 1}–{Math.min(pageEnd, totalShown)}
                </span>
                {" · pág. "}
                <span className="font-medium text-foreground">{safePage}</span> de {totalPages}
              </>
            )}
            {" · score medio "}
            <span className="font-medium text-foreground">{avgScore}/100</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/products/bulk"
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:border-foreground transition-colors"
          >
            Bulk · Excel
          </Link>
          <Link
            href="/admin/products/new"
            className="rounded-full bg-primary text-primary-foreground border border-primary px-5 py-2.5 text-sm font-semibold hover:bg-accent hover:border-accent transition-colors"
          >
            + Nuevo producto
          </Link>
        </div>
      </div>

      <form className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-5">
        <div className="grid gap-4 md:grid-cols-[1fr_180px_180px_auto] items-end">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Buscar</span>
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="nombre, ref, descripción…"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Catálogo</span>
            <select
              name="catalog"
              defaultValue={catalogSlug ?? ""}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            >
              <option value="">Todos</option>
              {catalogs.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Familia</span>
            <select
              name="family"
              defaultValue={family ?? ""}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            >
              <option value="">Todas</option>
              {families.map((f) => (
                <option key={f.family} value={f.family}>
                  {f.family} ({f.count})
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="bg-primary text-primary-foreground rounded-full px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors h-fit"
          >
            Filtrar
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 items-end">
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Estado</span>
            <select
              name="status"
              defaultValue={status ?? ""}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            >
              <option value="">Todos</option>
              <option value="published">Publicado</option>
              <option value="draft">Borrador</option>
              <option value="archived">Archivado</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Marca</span>
            <select
              name="brand"
              defaultValue={brandFilter ?? ""}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            >
              <option value="">Todas</option>
              {allBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto] items-end">
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Score: <span className="text-foreground font-medium">{scoreMin}</span> – <span className="text-foreground font-medium">{scoreMax}</span>
            </p>
            <div className="flex gap-3 items-center">
              <input
                type="number"
                name="score_min"
                min={0}
                max={100}
                defaultValue={scoreMin}
                className="w-20 bg-background border border-border rounded-lg px-3 py-2 text-sm"
              />
              <span className="text-muted-foreground text-sm">–</span>
              <input
                type="number"
                name="score_max"
                min={0}
                max={100}
                defaultValue={scoreMax}
                className="w-20 bg-background border border-border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <label className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Orden</span>
              <select
                name="sort"
                defaultValue={sortKey}
                className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              >
                <option value="ref">Por referencia</option>
                <option value="name">Por nombre + marca</option>
              </select>
            </label>
            <Toggle name="sin_gluten" label="Sin gluten" checked={onlySinGluten} />
            <Toggle name="sin_lactosa" label="Sin lactosa" checked={onlySinLactosa} />
            <Toggle name="vegetariano" label="Vegetariano" checked={onlyVegetariano} />
            {activeFilters > 0 && (
              <Link
                href="/admin/products"
                className="text-xs text-muted-foreground hover:text-accent ml-auto"
              >
                Limpiar ({activeFilters})
              </Link>
            )}
          </div>
        </div>
      </form>

      {totalShown === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No hay productos con esos filtros.
        </div>
      ) : (
        <ul className="space-y-2">
          {pageItems.map((p) => {
            const stat = p.status ?? (p.active === false ? "archived" : "published");
            const score = productScores.get(p.ref) ?? 0;
            return (
              <li key={p.ref}>
                <Link
                  href={`/admin/products/${encodeURIComponent(p.ref)}`}
                  className="grid items-center gap-4 rounded-2xl border border-border bg-background p-3 hover:border-accent hover:bg-secondary/40 transition-colors"
                  style={{ gridTemplateColumns: "auto 1fr auto auto auto" }}
                >
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt=""
                      className="h-14 w-14 rounded-lg object-cover bg-secondary shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-secondary shrink-0 grid place-items-center text-xs text-muted-foreground">
                      —
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Ref. {effectiveRef(metas[p.ref], p.ref)}
                      {p.family && <> · {p.family}</>}
                      {(() => {
                        const brand = metas[p.ref]?.brand_override?.trim() || p.brand;
                        return brand ? <> · {brand}</> : null;
                      })()}
                    </p>
                    {(productCatalogsMap[p.ref] ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(productCatalogsMap[p.ref] ?? []).map((slug) => {
                          const cat = catalogs.find((c) => c.slug === slug);
                          if (!cat) return null;
                          return (
                            <span
                              key={slug}
                              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border"
                              style={{
                                borderColor: (cat.color ?? "#fa2ca2") + "44",
                                color: cat.color ?? "#fa2ca2",
                                background: (cat.color ?? "#fa2ca2") + "14",
                              }}
                            >
                              {cat.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="hidden md:block w-32">
                    <ScoreBar value={score} />
                  </div>
                  <StatusPill status={stat} />
                  <span className="rounded-full bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 hover:bg-accent transition-colors">
                    Editar →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* Paginación: 50 por página. Se muestra solo si hay más de una página. */}
      {totalPages > 1 && (
        <nav
          aria-label="Paginación"
          className="flex flex-wrap items-center justify-center gap-2 pt-4"
        >
          {safePage > 1 ? (
            <Link
              href={hrefForPage(safePage - 1)}
              className="inline-flex items-center justify-center min-w-10 h-10 px-4 rounded-full border border-border text-sm font-medium hover:border-foreground transition-colors"
            >
              ← Anterior
            </Link>
          ) : (
            <span className="inline-flex items-center justify-center min-w-10 h-10 px-4 rounded-full border border-border text-sm font-medium opacity-30 cursor-not-allowed">
              ← Anterior
            </span>
          )}

          {(() => {
            const pages: (number | "ellipsis")[] = [];
            const push = (n: number) => {
              if (!pages.includes(n)) pages.push(n);
            };
            push(1);
            if (safePage > 3) pages.push("ellipsis");
            for (let n = Math.max(2, safePage - 1); n <= Math.min(totalPages - 1, safePage + 1); n++) push(n);
            if (safePage < totalPages - 2) pages.push("ellipsis");
            if (totalPages > 1) push(totalPages);
            return pages.map((p, i) =>
              p === "ellipsis" ? (
                <span key={`e${i}`} className="px-2 text-muted-foreground">…</span>
              ) : (
                <Link
                  key={p}
                  href={hrefForPage(p)}
                  className={`inline-flex items-center justify-center min-w-10 h-10 px-3 rounded-full border text-sm font-medium tabular-nums transition-colors ${
                    p === safePage
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-foreground"
                  }`}
                  aria-current={p === safePage ? "page" : undefined}
                >
                  {p}
                </Link>
              ),
            );
          })()}

          {safePage < totalPages ? (
            <Link
              href={hrefForPage(safePage + 1)}
              className="inline-flex items-center justify-center min-w-10 h-10 px-4 rounded-full border border-border text-sm font-medium hover:border-foreground transition-colors"
            >
              Siguiente →
            </Link>
          ) : (
            <span className="inline-flex items-center justify-center min-w-10 h-10 px-4 rounded-full border border-border text-sm font-medium opacity-30 cursor-not-allowed">
              Siguiente →
            </span>
          )}
        </nav>
      )}
    </div>
  );
}

function Toggle({
  name,
  label,
  checked,
}: {
  name: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
      <input
        type="checkbox"
        name={name}
        value="1"
        defaultChecked={checked}
        className="h-4 w-4 accent-accent"
      />
      <span>{label}</span>
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "bg-emerald-100 text-emerald-700 border-emerald-200",
    draft: "bg-amber-100 text-amber-700 border-amber-200",
    archived: "bg-secondary text-muted-foreground border-border",
  };
  const cls = map[status] ?? map.draft;
  return (
    <span className={`text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full border ${cls}`}>
      {status}
    </span>
  );
}

function ScoreBar({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  const color =
    clamped >= 70
      ? "bg-emerald-500"
      : clamped >= 40
        ? "bg-amber-500"
        : "bg-destructive";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="relative h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
        <div className={`absolute inset-y-0 left-0 ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs tabular-nums text-foreground w-9 text-right">{clamped}</span>
    </div>
  );
}
