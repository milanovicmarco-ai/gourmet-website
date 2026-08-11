import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/integrations/supabase/server";
import { computeOptimizationScore, adaptApiProduct } from "@/lib/pim/score";
import { getProductByRef } from "@/lib/pim/api";
import { mapFromApi } from "@/lib/pim/api-mapper";
import { listCatalogs, getProductCatalogs, listAllFamilies } from "@/lib/pim/catalogs";
import { loadBrandOptions } from "@/lib/pim/brands";
import { getTranslation } from "@/lib/pim/translations";
import { getProductMeta, effectiveRef, EMPTY_META } from "@/lib/pim/product-meta";
import { withTimeout } from "@/lib/with-timeout";
import { ImagesEditor } from "./images-editor";
import { CatalogPicker } from "./catalog-picker";
import { LocaleTabs } from "./locale-tabs";
import { DeleteProductButton } from "./delete-product-button";

export const dynamic = "force-dynamic";

/**
 * Estrategia de carga del editor (streaming con Suspense):
 *
 *   FASE 1 (await en el page principal — bloquea el render inicial):
 *     - getProductByRef (API del socio, lo único realmente crítico)
 *     - getProductMeta  (Supabase, suele ser rápido)
 *   Con esos dos ya se renderiza: cabecera + imagen + checklist + DangerZone.
 *
 *   FASE 2 (cada sección con su propia Suspense, en paralelo):
 *     - CatalogSection  → listCatalogs + getProductCatalogs
 *     - LocaleSection   → getTranslation + listAllFamilies + loadBrandOptions
 *
 * Si la API tarda 5s, antes el usuario veía la página en blanco 5s. Ahora ve
 * la cabecera en cuanto getProductByRef responde, y las secciones secundarias
 * se llenan independientemente sin bloquear las demás.
 */

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: ref } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // FASE 1: solo lo imprescindible para pintar la cabecera.
  // revalidate=60 → cache 1min. Suficiente para que abrir varios productos
  // seguidos sea instantáneo sin perder frescura visible.
  const [productOrError, meta] = await Promise.all([
    getProductByRef(ref, 60).catch((err: Error) => err),
    withTimeout(getProductMeta(ref), 12000, "getProductMeta", EMPTY_META(ref)),
  ]);
  if (productOrError instanceof Error) {
    throw new Error(`No se pudo cargar el producto ${ref}: ${productOrError.message}`);
  }
  const product = productOrError;
  if (!product) notFound();

  const formInitial = mapFromApi(product);
  const scoreLocal = computeOptimizationScore(adaptApiProduct(product, meta));
  const scoreServer = scoreLocal.total;

  return (
    <div className="px-5 md:px-10 py-8 space-y-8 max-w-5xl">
      <Link
        href="/admin/products"
        className="text-xs text-muted-foreground hover:text-accent transition-colors uppercase tracking-[0.18em]"
      >
        ← Volver al listado
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Ref. {effectiveRef(meta, product.ref)}
            {meta.display_ref && meta.display_ref.trim() && meta.display_ref !== product.ref && (
              <span className="opacity-50"> (canónica: {product.ref})</span>
            )}
            {product.family && <> · {product.family}</>}
          </p>
          <h1 className="font-display font-light text-3xl md:text-4xl tracking-tight mt-1">
            {product.name}
          </h1>
          {product.slug && (
            <p className="text-sm text-muted-foreground mt-2">
              <span className="opacity-60">slug:</span> <code className="text-xs">{product.slug}</code>
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Score de optimización
          </p>
          <p className="font-display font-light text-4xl mt-1 tabular-nums">
            <span
              className={
                scoreServer >= 70
                  ? "text-emerald-600"
                  : scoreServer >= 40
                    ? "text-amber-600"
                    : "text-destructive"
              }
            >
              {scoreServer}
            </span>
            <span className="text-muted-foreground text-2xl">/100</span>
          </p>
        </div>
      </header>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-10">
          <section className="rounded-2xl border border-border p-6 bg-background">
            <ImagesEditor
              productRef={product.ref}
              imageUrl={product.image_url ?? null}
              gallery={product.gallery ?? undefined}
            />
          </section>

          {/* FASE 2A: catálogos asignados. Skeleton mientras carga. */}
          <Suspense fallback={<SectionSkeleton title="Catálogos" rows={3} />}>
            <CatalogSection productRef={product.ref} />
          </Suspense>

          {/* FASE 2B: tabs ES/CA con formulario completo. Skeleton mientras carga. */}
          <Suspense fallback={<SectionSkeleton title="Datos del producto" rows={8} />}>
            <LocaleSection
              productRef={product.ref}
              product={product}
              esInitial={formInitial}
              meta={meta}
            />
          </Suspense>

          {/* Danger zone — instantáneo, no depende de fetches secundarios. */}
          <section className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 space-y-4">
            <div>
              <h2 className="font-display font-medium text-lg">Zona de peligro</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Eliminar un producto lo retira del catálogo público y del PIM.
                La acción es difícil de revertir si tu socio no guarda backups.
              </p>
            </div>
            <DeleteProductButton productRef={product.ref} productName={product.name} />
          </section>
        </div>
        <aside className="lg:col-span-4">
          <div className="sticky top-6 space-y-6">
            <div className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-3">
              <h2 className="font-display font-medium">Checklist de optimización</h2>
              <ul className="space-y-2">
                {scoreLocal.criteria.map((c) => (
                  <li key={c.key} className="flex items-start gap-2.5 text-sm">
                    <span
                      className={`mt-0.5 h-4 w-4 rounded-full grid place-items-center text-[10px] font-bold shrink-0 ${
                        c.passed
                          ? "bg-emerald-500 text-white"
                          : "bg-secondary border border-border text-muted-foreground"
                      }`}
                    >
                      {c.passed ? "✓" : ""}
                    </span>
                    <span className={c.passed ? "text-muted-foreground" : "text-foreground"}>
                      {c.label}
                      <span className="text-xs text-muted-foreground ml-1">+{c.weight}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                El score oficial lo calcula el servidor al guardar. Esta lista es
                sólo orientativa.
              </p>
            </div>
            {product.image_url && (
              <div className="rounded-2xl border border-border overflow-hidden bg-secondary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full aspect-square object-cover"
                />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Sección de catálogos: depende solo de listCatalogs + getProductCatalogs.
 *  Va en su propia Suspense para no bloquear cabecera ni imágenes. */
async function CatalogSection({ productRef }: { productRef: string }) {
  const [allCatalogs, assignedSlugs] = await Promise.all([
    withTimeout(listCatalogs(true), 8000, "listCatalogs", [] as Awaited<ReturnType<typeof listCatalogs>>),
    withTimeout(getProductCatalogs(productRef), 8000, "getProductCatalogs", [] as string[]),
  ]);
  const assignedIds = allCatalogs.filter((c) => assignedSlugs.includes(c.slug)).map((c) => c.id);
  return (
    <section className="rounded-2xl border border-border p-6 bg-background">
      <CatalogPicker
        productRef={productRef}
        allCatalogs={allCatalogs}
        initialIds={assignedIds}
      />
    </section>
  );
}

/** Sección ES/CA con formularios: depende de traducción + familias + marcas.
 *  Los 3 fetches van en paralelo, y la sección se renderiza cuando todos
 *  acaban (sigue siendo más rápido que esperar a TODA la página). */
async function LocaleSection({
  productRef,
  product,
  esInitial,
  meta,
}: {
  productRef: string;
  product: Awaited<ReturnType<typeof getProductByRef>>;
  esInitial: ReturnType<typeof mapFromApi>;
  meta: Awaited<ReturnType<typeof getProductMeta>>;
}) {
  if (!product) return null;
  const [caTranslation, allFamilies, brandOptions] = await Promise.all([
    withTimeout(getTranslation(productRef, "ca"), 8000, "getTranslation", null as Awaited<ReturnType<typeof getTranslation>>),
    withTimeout(listAllFamilies(), 8000, "listAllFamilies", [] as Awaited<ReturnType<typeof listAllFamilies>>),
    withTimeout(loadBrandOptions(), 8000, "loadBrandOptions", [] as Awaited<ReturnType<typeof loadBrandOptions>>),
  ]);
  return (
    <LocaleTabs
      productRef={productRef}
      product={product}
      esInitial={esInitial}
      caInitial={caTranslation}
      meta={meta}
      families={allFamilies}
      brandOptions={brandOptions}
    />
  );
}

/** Skeleton genérico para Suspense de secciones. */
function SectionSkeleton({ title, rows }: { title: string; rows: number }) {
  return (
    <section className="rounded-2xl border border-border p-6 bg-background animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-3 w-16 bg-muted rounded" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-24 bg-muted rounded" />
          <div className="h-10 w-full bg-muted rounded" />
        </div>
      ))}
      <span className="sr-only">{title} cargando…</span>
    </section>
  );
}
