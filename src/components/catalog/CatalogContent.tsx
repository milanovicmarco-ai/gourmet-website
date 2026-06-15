// Cuerpo principal del catálogo: hero + filtros + grid filtrada + paginación.
// Se monta dentro de una <Suspense> en las páginas /es/catalogo y /ca/cataleg
// para que el chrome y la sección "Selección Aurellano" rendericen antes de
// que termine este fetch (que itera por familia, lo más lento de la página).

import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { listFamilies, fetchAllProducts, type ApiProduct } from "@/lib/pim/api";
import { getMetasForProducts, effectiveRef, effectiveBrand, matchesSearch } from "@/lib/pim/product-meta";
import { listCatalogs, listAllFamilies, getRefsByCatalogSlug, humanizeFamilySlug } from "@/lib/pim/catalogs";
import { getTranslationsForProducts, type ProductTranslation } from "@/lib/pim/translations";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";
import { MessageCircle, X } from "lucide-react";
import { waLink } from "@/lib/contact";

const PAGE_SIZE = 20;

const csvParse = (s: string | undefined): string[] =>
  s
    ? s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    : [];

type Lang = "es" | "ca";

const STRINGS = {
  es: {
    catalogo: "Catálogo",
    encuentra: "Encuentra el producto",
    comotrabajas: "como tú trabajas.",
    filtraDesc: "Filtra por familia, alérgeno o búsqueda libre. Si no lo encuentras, lo conseguimos.",
    buscar: "Buscar",
    placeholder: "nombre, marca…",
    filtrar: "Filtrar",
    familia: "Familia",
    marca: "Marca",
    alergenos: "Alérgenos",
    menu: "Menú",
    destacados: "Destacados",
    ordenarPor: "Ordenar por",
    nombre: "Nombre",
    referencia: "Referencia",
    limpiarFiltros: "Limpiar filtros",
    producto: "producto",
    productos: "productos",
    mostrando: "mostrando",
    pagina: "Página",
    de: "de",
    noConectar: "No se pudo conectar con el catálogo.",
    cero: "0 productos",
    noResultados: "No hay resultados",
    pruebaAjustar:
      "Prueba ajustando los filtros o pídenos la referencia. Tenemos +200 proveedores y red de importación.",
    pedirRef: "Pedir referencia",
    anterior: "← Anterior",
    siguiente: "Siguiente →",
    waMsg: "Hola Aurellano, busco una referencia concreta. ¿Podéis conseguirla?",
  },
  ca: {
    catalogo: "Catàleg",
    encuentra: "Troba el producte",
    comotrabajas: "com tu treballes.",
    filtraDesc: "Filtra per família, al·lèrgens o cerca lliure. Si no el trobes, te'l aconseguim.",
    buscar: "Cercar",
    placeholder: "nom, marca…",
    filtrar: "Filtrar",
    familia: "Família",
    marca: "Marca",
    alergenos: "Al·lèrgens",
    menu: "Menú",
    destacados: "Destacats",
    ordenarPor: "Ordenar per",
    nombre: "Nom",
    referencia: "Referència",
    limpiarFiltros: "Netejar filtres",
    producto: "producte",
    productos: "productes",
    mostrando: "mostrant",
    pagina: "Pàgina",
    de: "de",
    noConectar: "No s'ha pogut connectar amb el catàleg.",
    cero: "0 productes",
    noResultados: "Sense resultats",
    pruebaAjustar:
      "Prova d'ajustar els filtres o demana'ns la referència. Tenim +200 proveïdors i xarxa d'importació.",
    pedirRef: "Demanar referència",
    anterior: "← Anterior",
    siguiente: "Següent →",
    waMsg: "Hola Aurellano, busco una referència concreta. La podeu aconseguir?",
  },
} as const;

const dietaOptionsFor = (lang: Lang) =>
  lang === "ca"
    ? [
        { value: "sin_gluten", label: "Sense gluten" },
        { value: "sin_lactosa", label: "Sense lactosa" },
        { value: "vegetariano", label: "Vegetarià" },
        { value: "vegano", label: "Vegà" },
        { value: "sin_frutos_secos", label: "Sense fruits secs" },
        { value: "sin_azucares_anadidos", label: "Sense sucres afegits" },
        { value: "alto_proteinas", label: "Alt en proteïnes" },
        { value: "keto", label: "Keto" },
      ]
    : [
        { value: "sin_gluten", label: "Sin gluten" },
        { value: "sin_lactosa", label: "Sin lactosa" },
        { value: "vegetariano", label: "Vegetariano" },
        { value: "vegano", label: "Vegano" },
        { value: "sin_frutos_secos", label: "Sin frutos secos" },
        { value: "sin_azucares_anadidos", label: "Sin azúcares añadidos" },
        { value: "alto_proteinas", label: "Alto en proteínas" },
        { value: "keto", label: "Keto" },
      ];

const menuOptionsFor = (lang: Lang) =>
  lang === "ca"
    ? [
        { value: "aperitivo", label: "Aperitiu" },
        { value: "entrante", label: "Entrant" },
        { value: "principal", label: "Principal" },
        { value: "guarnicion", label: "Guarnició" },
        { value: "postre", label: "Postres" },
      ]
    : [
        { value: "aperitivo", label: "Aperitivo" },
        { value: "entrante", label: "Entrante" },
        { value: "principal", label: "Principal" },
        { value: "guarnicion", label: "Guarnición" },
        { value: "postre", label: "Postre" },
      ];

const especialidadOptionsFor = (lang: Lang) =>
  lang === "ca"
    ? [
        { value: "destacado", label: "Destacat" },
        { value: "primer_precio", label: "Primer preu" },
      ]
    : [
        { value: "destacado", label: "Destacado" },
        { value: "primer_precio", label: "Primer precio" },
      ];

export type CatalogContentSP = {
  q?: string;
  family?: string;
  brand?: string;
  catalog?: string;
  dieta?: string;
  menu?: string;
  gama?: string;
  especialidad?: string;
  page?: string;
  /** Orden: "name" (alfabético por nombre, default) o "ref" (por referencia). */
  sort?: string;
};

type SortKey = "name" | "ref";
const VALID_SORTS: SortKey[] = ["name", "ref"];

interface Props {
  sp: CatalogContentSP;
  /** "/es/catalogo" o "/ca/cataleg" — para los Links internos (paginación, limpiar filtros). */
  basePath: string;
  /** "/es/producto" o "/ca/producte" — para los href de cada ProductCard. */
  productHrefBase: string;
  /** Idioma del wrapper que renderiza este componente. Default "es". */
  lang?: Lang;
}

export async function CatalogContent({ sp, basePath, productHrefBase, lang = "es" }: Props) {
  const T = STRINGS[lang];
  const DIETA_OPTIONS = dietaOptionsFor(lang);
  const MENU_OPTIONS = menuOptionsFor(lang);
  const ESPECIALIDAD_OPTIONS = especialidadOptionsFor(lang);
  const q = sp.q?.trim() || undefined;
  const catalogSlug = sp.catalog?.trim() || undefined;
  const familySel = csvParse(sp.family);
  const brandSel = csvParse(sp.brand).map((b) => b.toLowerCase().trim());
  const dietaSel = csvParse(sp.dieta);
  const menuSel = csvParse(sp.menu);
  const gamaSel = csvParse(sp.gama).map(Number).filter((n) => Number.isFinite(n));
  const especialidadSel = csvParse(sp.especialidad);
  const currentPage = Math.max(1, Number(sp.page) || 1);
  const sortKey: SortKey = VALID_SORTS.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : "name";

  let products: ApiProduct[] = [];
  let error: string | null = null;

  const [allProducts, fa, ca, af] = await Promise.all([
    fetchAllProducts({ revalidate: 3600 }).catch((e) => {
      console.warn("[catalog] fetchAllProducts:", (e as Error).message);
      error = (e as Error).message;
      return [] as ApiProduct[];
    }),
    listFamilies().catch(() => [] as Awaited<ReturnType<typeof listFamilies>>),
    listCatalogs().catch(() => []),
    listAllFamilies().catch(() => []),
  ]);
  products = allProducts;
  // families = fa (unused here)
  void fa;
  const catalogs = ca;
  const allFamilies = af;

  // Filtro por familia
  if (familySel.length > 0) {
    const set = new Set(familySel);
    products = products.filter((p) => p.family && set.has(p.family));
  }

  // Filtro por catálogo de publicación
  let activeCatalog: (typeof catalogs)[number] | null = null;
  if (catalogSlug && !error) {
    activeCatalog = catalogs.find((c) => c.slug === catalogSlug) ?? null;
    const refsInCatalog = await getRefsByCatalogSlug(catalogSlug).catch(() => []);
    const set = new Set(refsInCatalog);
    products = products.filter((p) => set.has(p.ref));
  }

  const metas = await getMetasForProducts(products.map((p) => p.ref)).catch(() => ({}));

  // Si la página es la versión catalana, cargamos en bulk las traducciones
  // CA para sobrescribir nombres/descripciones. Una sola query a Supabase,
  // sin N+1. En la versión ES no hace falta (la API ya viene en ES).
  const translations: Record<string, ProductTranslation> =
    lang === "ca"
      ? await getTranslationsForProducts(
          products.map((p) => p.ref),
          "ca",
        ).catch(() => ({}))
      : {};

  /** Devuelve el nombre del producto en el idioma actual: traducción si
   *  existe y tiene contenido, si no la canónica de la API. */
  const displayName = (p: ApiProduct): string => {
    const t = translations[p.ref];
    return t?.name?.trim() || p.name;
  };

  /** Idem para la descripción corta — usada en search match. */
  const displayDescCorta = (p: ApiProduct): string | null | undefined => {
    const t = translations[p.ref];
    return t?.descripcion_corta?.trim() || p.descripcion_corta;
  };

  const matchesDieta = (p: ApiProduct, sel: string[]): boolean => {
    if (sel.length === 0) return true;
    const m = metas[p.ref];
    const ok: Record<string, boolean> = {
      sin_gluten: !!p.sin_gluten,
      sin_lactosa: !!p.sin_lactosa,
      vegetariano: !!p.vegetariano,
      vegano: !!m?.diet_vegan,
      sin_frutos_secos: !!m?.diet_no_nuts,
      sin_azucares_anadidos: !!m?.diet_no_added_sugar,
      alto_proteinas: !!m?.diet_high_protein,
      keto: !!m?.diet_keto,
    };
    return sel.some((d) => ok[d]);
  };

  const matchesEspecialidad = (p: ApiProduct, sel: string[]): boolean => {
    if (sel.length === 0) return true;
    const m = metas[p.ref];
    const ok: Record<string, boolean> = {
      destacado: !!m?.destacado,
      primer_precio: !!m?.primer_precio,
    };
    return sel.some((e) => ok[e]);
  };

  const isPublished = (p: ApiProduct): boolean => {
    const effectiveStatus = p.status ?? (p.active === false ? "archived" : "published");
    return effectiveStatus === "published";
  };

  // Listado de marcas únicas
  const brandsMap = new Map<string, string>();
  for (const p of products) {
    if (!isPublished(p)) continue;
    const b = effectiveBrand(metas[p.ref], p.brand);
    if (!b) continue;
    const key = b.toLowerCase().trim();
    if (!brandsMap.has(key)) brandsMap.set(key, b);
  }
  const allBrands = Array.from(brandsMap.values()).sort((a, b) => a.localeCompare(b));

  // Conteo familias publicadas
  const familyCounts = new Map<string, number>();
  for (const p of products) {
    if (!isPublished(p)) continue;
    if (!p.family) continue;
    familyCounts.set(p.family, (familyCounts.get(p.family) ?? 0) + 1);
  }
  const familiesPublished = allFamilies
    .map((f) => ({
      slug: f.slug,
      display_name: f.display_name || f.slug,
      count: familyCounts.get(f.slug) ?? 0,
      active: f.active,
    }))
    .filter((f) => f.count > 0 && f.active !== false)
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  const brandSelSet = new Set(brandSel);
  const menuSelSet = new Set(menuSel);
  const gamaSelSet = new Set(gamaSel);

  const filtered = products.filter((p) => {
    if (!isPublished(p)) return false;
    if (
      q &&
      !matchesSearch(
        [displayName(p), p.name, effectiveBrand(metas[p.ref], p.brand), effectiveRef(metas[p.ref], p.ref), p.ref, displayDescCorta(p)],
        q,
      )
    )
      return false;
    if (brandSelSet.size > 0) {
      const b = effectiveBrand(metas[p.ref], p.brand).toLowerCase().trim();
      if (!brandSelSet.has(b)) return false;
    }
    if (!matchesDieta(p, dietaSel)) return false;
    if (menuSelSet.size > 0) {
      const m = metas[p.ref];
      if (!m?.momento_plato || !menuSelSet.has(m.momento_plato)) return false;
    }
    if (gamaSelSet.size > 0) {
      const m = metas[p.ref];
      if (m?.gama == null || !gamaSelSet.has(m.gama)) return false;
    }
    if (!matchesEspecialidad(p, especialidadSel)) return false;
    return true;
  });

  // Orden: alfabético por nombre (default) o por referencia.
  if (sortKey === "ref") {
    filtered.sort((a, b) =>
      (a.ref ?? "").localeCompare(b.ref ?? "", undefined, { numeric: true, sensitivity: "base" }),
    );
  } else {
    // Por nombre: los que empiezan por número van al final.
    filtered.sort((a, b) => {
      const an = a.name ?? "";
      const bn = b.name ?? "";
      const aNum = /^\s*\d/.test(an) ? 1 : 0;
      const bNum = /^\s*\d/.test(bn) ? 1 : 0;
      if (aNum !== bNum) return aNum - bNum;
      return an.localeCompare(bn, "es", { sensitivity: "base", numeric: true });
    });
  }

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageEnd);

  const hrefForPage = (n: number): string => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (catalogSlug) params.set("catalog", catalogSlug);
    if (familySel.length) params.set("family", familySel.join(","));
    if (brandSel.length) params.set("brand", brandSel.join(","));
    if (dietaSel.length) params.set("dieta", dietaSel.join(","));
    if (menuSel.length) params.set("menu", menuSel.join(","));
    if (gamaSel.length) params.set("gama", gamaSel.join(","));
    if (especialidadSel.length) params.set("especialidad", especialidadSel.join(","));
    if (sortKey !== "name") params.set("sort", sortKey);
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  const totalActive =
    [q, catalogSlug].filter(Boolean).length +
    familySel.length +
    brandSel.length +
    dietaSel.length +
    menuSel.length +
    gamaSel.length +
    especialidadSel.length;

  const familyDisplay = new Map<string, string>();
  for (const f of allFamilies) {
    familyDisplay.set(f.slug, f.display_name || humanizeFamilySlug(f.slug));
  }
  const familyLabel = (slug: string | null | undefined): string => {
    if (!slug) return "—";
    return familyDisplay.get(slug) ?? humanizeFamilySlug(slug);
  };

  return (
    <>
      {/* Hero */}
      <section className="container-edit pt-32 md:pt-40 pb-10 md:pb-14">
        <div className="max-w-4xl space-y-6">
          <p className="eyebrow">{activeCatalog ? `${T.catalogo} · ${activeCatalog.name}` : T.catalogo}</p>
          <h1 className="display text-balance">
            {activeCatalog ? (
              <>{activeCatalog.name}</>
            ) : (
              <>
                {T.encuentra}<br />
                <span className="italic font-light text-accent">{T.comotrabajas}</span>
              </>
            )}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl text-pretty">
            {activeCatalog?.description ?? T.filtraDesc}
          </p>
        </div>
      </section>

      {/* Filtros — full width del container para alinear con la grid de productos. */}
      <section className="container-edit pb-8">
        <form className="space-y-3">
          {catalogSlug && <input type="hidden" name="catalog" value={catalogSlug} />}
          <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{T.buscar}</span>
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder={T.placeholder}
                className="w-full bg-secondary border border-border rounded-full px-5 py-3 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
              />
            </label>
            <button
              type="submit"
              className="bg-primary text-primary-foreground rounded-full px-7 py-3 font-medium hover:bg-accent transition-colors h-fit"
            >
              {T.filtrar}
            </button>
          </div>
          {/* Filtros + orden, todos como columnas del mismo grid → alineados. */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <MultiSelectFilter
              label={T.familia}
              name="family"
              defaultValues={familySel}
              options={familiesPublished.map((f) => ({
                value: f.slug,
                label: f.display_name,
                hint: `${f.count}`,
              }))}
            />
            <MultiSelectFilter
              label={T.marca}
              name="brand"
              defaultValues={brandSel}
              options={allBrands.map((b) => ({ value: b.toLowerCase().trim(), label: b }))}
            />
            <MultiSelectFilter
              label={T.alergenos}
              name="dieta"
              defaultValues={dietaSel}
              options={DIETA_OPTIONS}
            />
            {catalogSlug === "horeca" && (
              <MultiSelectFilter
                label={T.menu}
                name="menu"
                defaultValues={menuSel}
                options={MENU_OPTIONS}
              />
            )}
            <MultiSelectFilter
              label={T.destacados}
              name="especialidad"
              defaultValues={especialidadSel}
              options={ESPECIALIDAD_OPTIONS}
            />
            {/* Sort como columna del mismo grid → alineado con los demás filtros. */}
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{T.ordenarPor}</span>
              <select
                name="sort"
                defaultValue={sortKey}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
              >
                <option value="name">{T.nombre}</option>
                <option value="ref">{T.referencia}</option>
              </select>
            </label>
          </div>
        </form>

        {totalActive > 0 && (
          <div className="flex items-center justify-end mt-4">
            <Link
              href={catalogSlug ? `${basePath}?catalog=${catalogSlug}` : basePath}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              {T.limpiarFiltros}
            </Link>
          </div>
        )}
      </section>

      {/* Grid + paginación */}
      <section className="container-edit pb-24 md:pb-32">
        <div className="border-b border-border pb-4 mb-8 flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {error ? (
              <span className="text-destructive">{T.noConectar}</span>
            ) : totalCount > 0 ? (
              <>
                <span className="font-semibold text-foreground">{totalCount}</span>{" "}
                {totalCount === 1 ? T.producto : T.productos}
                {totalPages > 1 && (
                  <>
                    {" · "}
                    {T.mostrando}{" "}
                    <span className="font-medium text-foreground">
                      {pageStart + 1}–{Math.min(pageEnd, totalCount)}
                    </span>
                  </>
                )}
              </>
            ) : (
              <span>{T.cero}</span>
            )}
          </p>
          {totalPages > 1 && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {T.pagina} <span className="font-medium text-foreground">{safePage}</span> {T.de} {totalPages}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            {error}
          </div>
        )}

        {!error && pageItems.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {pageItems.map((p) => (
              <ProductCard
                key={p.ref}
                image={p.image_url ?? "/images/placeholder.svg"}
                title={displayName(p)}
                category={familyLabel(p.family)}
                origin={`Ref. ${effectiveRef(metas[p.ref], p.ref)}`}
                href={`${productHrefBase}/${p.slug ?? p.ref}`}
              />
            ))}
          </div>
        ) : !error ? (
          <div className="rounded-3xl border border-dashed border-border p-12 md:p-16 text-center space-y-5">
            <h3 className="font-display font-light text-3xl">{T.noResultados}</h3>
            <p className="text-muted-foreground max-w-md mx-auto">{T.pruebaAjustar}</p>
            <a
              href={waLink(T.waMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full pl-5 pr-6 py-3 text-sm font-medium hover:bg-accent transition-colors"
            >
              <MessageCircle className="h-4 w-4" /> {T.pedirRef}
            </a>
          </div>
        ) : null}

        {!error && totalPages > 1 && (
          <nav aria-label="Paginación" className="mt-14 flex flex-wrap items-center justify-center gap-2">
            {safePage > 1 ? (
              <Link
                href={hrefForPage(safePage - 1)}
                className="inline-flex items-center justify-center min-w-10 h-10 px-4 rounded-full border border-border text-sm font-medium hover:border-foreground transition-colors"
              >
                {T.anterior}
              </Link>
            ) : (
              <span className="inline-flex items-center justify-center min-w-10 h-10 px-4 rounded-full border border-border text-sm font-medium opacity-30 cursor-not-allowed">
                {T.anterior}
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
                {T.siguiente}
              </Link>
            ) : (
              <span className="inline-flex items-center justify-center min-w-10 h-10 px-4 rounded-full border border-border text-sm font-medium opacity-30 cursor-not-allowed">
                {T.siguiente}
              </span>
            )}
          </nav>
        )}
      </section>
    </>
  );
}

/** Skeleton para mostrar mientras el catálogo grande termina de cargar. */
export function CatalogContentSkeleton() {
  return (
    <>
      {/* Hero placeholder */}
      <section className="container-edit pt-32 md:pt-40 pb-10 md:pb-14">
        <div className="max-w-4xl space-y-6">
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          <div className="space-y-3">
            <div className="h-12 md:h-16 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-12 md:h-16 w-1/2 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-5 w-full max-w-2xl bg-muted rounded animate-pulse" />
        </div>
      </section>

      {/* Filtros placeholder */}
      <section className="container-edit pb-8 max-w-5xl space-y-3">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
          <div className="h-12 bg-secondary border border-border rounded-full animate-pulse" />
          <div className="h-12 w-28 bg-muted rounded-full animate-pulse" />
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-secondary border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      </section>

      {/* Grid placeholder */}
      <section className="container-edit pb-24 md:pb-32">
        <div className="border-b border-border pb-4 mb-8 flex items-baseline justify-between">
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[4/5] bg-muted rounded-2xl animate-pulse" />
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
