import type { Metadata } from "next";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { fetchAllProducts, listFamilies, type ApiProduct } from "@/lib/pim/api";
import { getMetasForProducts, effectiveRef, effectiveBrand } from "@/lib/pim/product-meta";
import { listCatalogs, listAllFamilies, getRefsByCatalogSlug, humanizeFamilySlug } from "@/lib/pim/catalogs";
import { MultiSelectFilter } from "./multi-select-filter";
import { MessageCircle, X } from "lucide-react";
import { waLink } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Catálogo gourmet",
  description:
    "Filtra +10.000 referencias gourmet por familia, alérgeno o precio. Quesos, foie, conservas, despensa y línea Especial Sin.",
  alternates: { canonical: "/catalogo" },
};

export const revalidate = 600;
export const dynamic = "force-dynamic";

type SP = {
  q?: string;
  family?: string;
  brand?: string;
  /** Slug del catálogo de publicación (seleccion-aurellano, retail, horeca, …). */
  catalog?: string;
  /** Múltiple. CSV de: sin_gluten | sin_lactosa | vegetariano | vegano |
   *  sin_frutos_secos | sin_azucares_anadidos | alto_proteinas | keto. */
  dieta?: string;
  /** Múltiple. CSV de momentos del plato. */
  menu?: string;
  /** Múltiple. CSV de gamas "1".."6". */
  gama?: string;
  /** Múltiple. CSV de flags de especialidad (destacado, primer_precio, …). */
  especialidad?: string;
};

const csvParse = (s: string | undefined): string[] =>
  s
    ? s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
    : [];

const DIETA_OPTIONS: { value: string; label: string }[] = [
  { value: "sin_gluten", label: "Sin gluten" },
  { value: "sin_lactosa", label: "Sin lactosa" },
  { value: "vegetariano", label: "Vegetariano" },
  { value: "vegano", label: "Vegano" },
  { value: "sin_frutos_secos", label: "Sin frutos secos" },
  { value: "sin_azucares_anadidos", label: "Sin azúcares añadidos" },
  { value: "alto_proteinas", label: "Alto en proteínas" },
  { value: "keto", label: "Keto" },
];

const MENU_OPTIONS: { value: string; label: string }[] = [
  { value: "aperitivo", label: "Aperitivo" },
  { value: "entrante", label: "Entrante" },
  { value: "principal", label: "Principal" },
  { value: "guarnicion", label: "Guarnición" },
  { value: "postre", label: "Postre" },
];

const GAMA_OPTIONS: { value: string; label: string }[] = [
  { value: "1", label: "1ª gama · fresco" },
  { value: "2", label: "2ª gama · conserva" },
  { value: "3", label: "3ª gama · congelado" },
  { value: "4", label: "4ª gama · fresco listo" },
  { value: "5", label: "5ª gama · cocinado refrigerado" },
  { value: "6", label: "6ª gama · liofilizado" },
];

const ESPECIALIDAD_OPTIONS: { value: string; label: string }[] = [
  { value: "destacado", label: "Destacado" },
  { value: "primer_precio", label: "Primer precio" },
];

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const catalogSlug = sp.catalog?.trim() || undefined;
  // Filtros multi-opción: vienen como CSV en la URL ("?family=QUESOS,FOIE_GRAS").
  const familySel = csvParse(sp.family);
  const brandSel = csvParse(sp.brand).map((b) => b.toLowerCase().trim());
  const dietaSel = csvParse(sp.dieta);
  const menuSel = csvParse(sp.menu);
  const gamaSel = csvParse(sp.gama).map(Number).filter((n) => Number.isFinite(n));
  const especialidadSel = csvParse(sp.especialidad);

  let products: ApiProduct[] = [];
  let families: Awaited<ReturnType<typeof listFamilies>> = [];
  let error: string | null = null;

  let catalogs: Awaited<ReturnType<typeof listCatalogs>> = [];
  let activeCatalog: (typeof catalogs)[number] | null = null;
  let allFamilies: Awaited<ReturnType<typeof listAllFamilies>> = [];

  try {
    const [pr, fa, ca, af] = await Promise.all([
      // fetchAllProducts itera por familia para sortear el cap de 200/request,
      // así el filtro por marca ve TODO el catálogo, no sólo 200.
      fetchAllProducts({ q, revalidate: 300 }),
      listFamilies(),
      listCatalogs().catch(() => []),
      listAllFamilies().catch(() => []),
    ]);
    products = pr;
    families = fa;
    catalogs = ca;
    allFamilies = af;
  } catch (e) {
    error = (e as Error).message;
  }

  // Aplica el filtro multi-opción por familia (OR dentro del filtro).
  if (familySel.length > 0) {
    const set = new Set(familySel);
    products = products.filter((p) => p.family && set.has(p.family));
  }

  // Filtro por catálogo de publicación: intersecta la lista con los refs asignados.
  if (catalogSlug && !error) {
    activeCatalog = catalogs.find((c) => c.slug === catalogSlug) ?? null;
    const refsInCatalog = await getRefsByCatalogSlug(catalogSlug).catch(() => []);
    const set = new Set(refsInCatalog);
    products = products.filter((p) => set.has(p.ref));
  }

  // Cargamos metas ANTES de filtrar porque la marca, momento_plato, gama y diet
  // extras viven en el overlay de Supabase (product_meta).
  const metas = await getMetasForProducts(products.map((p) => p.ref)).catch(() => ({}));

  /** ¿El producto cumple alguno de los atributos de dieta seleccionados? (OR). */
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

  /** ¿El producto cumple alguno de los flags de especialidad seleccionados? (OR). */
  const matchesEspecialidad = (p: ApiProduct, sel: string[]): boolean => {
    if (sel.length === 0) return true;
    const m = metas[p.ref];
    const ok: Record<string, boolean> = {
      destacado: !!m?.destacado,
      primer_precio: !!m?.primer_precio,
    };
    return sel.some((e) => ok[e]);
  };

  /** Helper: ¿el producto está publicado? La web pública SÓLO los muestra. */
  const isPublished = (p: ApiProduct): boolean => {
    const effectiveStatus = p.status ?? (p.active === false ? "archived" : "published");
    return effectiveStatus === "published";
  };

  // Listado único de marcas vistas en productos publicados (case-insensitive).
  const brandsMap = new Map<string, string>(); // key: lowercase, value: canonical
  for (const p of products) {
    if (!isPublished(p)) continue;
    const b = effectiveBrand(metas[p.ref], p.brand);
    if (!b) continue;
    const key = b.toLowerCase().trim();
    if (!brandsMap.has(key)) brandsMap.set(key, b);
  }
  const allBrands = Array.from(brandsMap.values()).sort((a, b) => a.localeCompare(b));

  // Contador de productos PUBLICADOS por familia (la API lista cuenta TODO).
  const familyCounts = new Map<string, number>();
  for (const p of products) {
    if (!isPublished(p)) continue;
    if (!p.family) continue;
    familyCounts.set(p.family, (familyCounts.get(p.family) ?? 0) + 1);
  }
  // Combina con el overlay (display_name) para que el dropdown enseñe el nombre humano.
  const familiesPublished = allFamilies
    .map((f) => ({
      slug: f.slug,
      display_name: f.display_name || f.slug,
      count: familyCounts.get(f.slug) ?? 0,
      active: f.active,
    }))
    .filter((f) => f.count > 0 && f.active !== false)
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  // Filtros adicionales que la API no soporta como query: aplicamos en memoria.
  // La web pública SOLO muestra productos en estado "published".
  // Dentro de cada filtro: OR. Entre filtros distintos: AND.
  const brandSelSet = new Set(brandSel);
  const menuSelSet = new Set(menuSel);
  const gamaSelSet = new Set(gamaSel);

  /** ¿El producto está destacado en algún catálogo (nuevo) o globalmente (legacy)? */
  const isDestacado = (p: ApiProduct): boolean => {
    const m = metas[p.ref];
    if (!m) return false;
    if (Array.isArray(m.destacado_en) && m.destacado_en.length > 0) return true;
    return !!m.destacado;
  };

  const filtered = products.filter((p) => {
    if (!isPublished(p)) return false;
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

  // Orden: primero los destacados, luego por ref ascendente (numeric collation
  // para que "ref_2" venga antes que "ref_10").
  filtered.sort((a, b) => {
    const aD = isDestacado(a) ? 1 : 0;
    const bD = isDestacado(b) ? 1 : 0;
    if (aD !== bD) return bD - aD; // destacados primero
    return a.ref.localeCompare(b.ref, undefined, { numeric: true, sensitivity: "base" });
  });

  const totalActive =
    [q, catalogSlug].filter(Boolean).length +
    familySel.length +
    brandSel.length +
    dietaSel.length +
    menuSel.length +
    gamaSel.length +
    especialidadSel.length;

  // Resuelve slug de familia → display name. Si no hay overlay, humaniza el slug
  // ("FOIE_GRAS" → "Foie gras") para que las tarjetas nunca enseñen UPPER_SNAKE_CASE.
  const familyDisplay = new Map<string, string>();
  for (const f of allFamilies) {
    familyDisplay.set(f.slug, f.display_name || humanizeFamilySlug(f.slug));
  }
  const familyLabel = (slug: string | null | undefined): string => {
    if (!slug) return "—";
    return familyDisplay.get(slug) ?? humanizeFamilySlug(slug);
  };

  return (
    <Layout navTheme="light">
      <section className="container-edit pt-32 md:pt-40 pb-10 md:pb-14">
        <div className="max-w-4xl space-y-6">
          <p className="eyebrow">
            {activeCatalog ? `Catálogo · ${activeCatalog.name}` : "Catálogo"}
          </p>
          <h1 className="display text-balance">
            {activeCatalog ? (
              <>{activeCatalog.name}</>
            ) : (
              <>
                Encuentra el producto<br />
                <span className="italic font-light text-accent">como tú trabajas.</span>
              </>
            )}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl text-pretty">
            {activeCatalog?.description ??
              "Filtra por familia, alérgeno o búsqueda libre. Si no lo encuentras, lo conseguimos."}
          </p>
        </div>
      </section>

      <section className="container-edit pb-8 max-w-5xl">
        <form className="space-y-3">
          {/* Preserva el catálogo activo en envíos del form (hidden input). */}
          {catalogSlug && <input type="hidden" name="catalog" value={catalogSlug} />}

          {/* Fila 1: Buscar (ancho) + botón Filtrar. */}
          <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
            <label className="block space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Buscar</span>
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="nombre, marca, origen…"
                className="w-full bg-secondary border border-border rounded-full px-5 py-3 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
              />
            </label>
            <button
              type="submit"
              className="bg-primary text-primary-foreground rounded-full px-7 py-3 font-medium hover:bg-accent transition-colors h-fit"
            >
              Filtrar
            </button>
          </div>

          {/* Fila 2: filtros multi-opción (cada uno acepta varios valores). */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <MultiSelectFilter
              label="Familia"
              name="family"
              defaultValues={familySel}
              options={familiesPublished.map((f) => ({
                value: f.slug,
                label: f.display_name,
                hint: `${f.count}`,
              }))}
            />
            <MultiSelectFilter
              label="Marca"
              name="brand"
              defaultValues={brandSel}
              options={allBrands.map((b) => ({ value: b.toLowerCase().trim(), label: b }))}
            />
            <MultiSelectFilter
              label="Alérgenos"
              name="dieta"
              defaultValues={dietaSel}
              options={DIETA_OPTIONS}
            />
            <MultiSelectFilter
              label="Menú"
              name="menu"
              defaultValues={menuSel}
              options={MENU_OPTIONS}
            />
            <MultiSelectFilter
              label="Gama"
              name="gama"
              defaultValues={gamaSel.map(String)}
              options={GAMA_OPTIONS}
            />
            <MultiSelectFilter
              label="Especialidad"
              name="especialidad"
              defaultValues={especialidadSel}
              options={ESPECIALIDAD_OPTIONS}
            />
          </div>
        </form>

        {totalActive > 0 && (
          <div className="flex items-center justify-end mt-4">
            <Link
              href={catalogSlug ? `/catalogo?catalog=${catalogSlug}` : "/catalogo"}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar filtros
            </Link>
          </div>
        )}
      </section>

      <section className="container-edit pb-24 md:pb-32">
        <div className="border-b border-border pb-4 mb-8">
          <p className="text-sm text-muted-foreground">
            {error ? (
              <span className="text-destructive">No se pudo conectar con el catálogo.</span>
            ) : (
              <>
                <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
                producto{filtered.length === 1 ? "" : "s"}
              </>
            )}
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            {error}
          </div>
        )}

        {!error && filtered.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {filtered.map((p) => (
              <ProductCard
                key={p.ref}
                image={p.image_url ?? "/images/placeholder.svg"}
                title={p.name}
                category={familyLabel(p.family)}
                // Debajo del nombre: la ref visible (display_ref si está, si no la canónica).
                origin={`Ref. ${effectiveRef(metas[p.ref], p.ref)}`}
                href={`/producto/${p.slug ?? p.ref}`}
              />
            ))}
          </div>
        ) : !error ? (
          <div className="rounded-3xl border border-dashed border-border p-12 md:p-16 text-center space-y-5">
            <h3 className="font-display font-light text-3xl">No hay resultados</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Prueba ajustando los filtros o pídenos la referencia. Tenemos +200 proveedores y red de importación.
            </p>
            <a
              href={waLink("Hola Aurellano, busco una referencia concreta. ¿Podéis conseguirla?")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full pl-5 pr-6 py-3 text-sm font-medium hover:bg-accent transition-colors"
            >
              <MessageCircle className="h-4 w-4" /> Pedir referencia
            </a>
          </div>
        ) : null}
      </section>
    </Layout>
  );
}

