import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/integrations/supabase/server";
import { computeOptimizationScore, adaptApiProduct } from "@/lib/pim/score";
import { getProductByRef, listBrands, listFamiliesEntities } from "@/lib/pim/api";
import { mapFromApi } from "@/lib/pim/api-mapper";
import { listCatalogs, getProductCatalogs } from "@/lib/pim/catalogs";
import { ProductEditForm } from "./edit-form";
import { ImagesEditor } from "./images-editor";
import { CatalogPicker } from "./catalog-picker";

export const dynamic = "force-dynamic";

// Aunque la carpeta sigue llamándose [id] por compatibilidad, el parámetro
// es la `ref` del producto (string como "17601" o "QUESOS-0042").
export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: ref } = await params;
  // Skip Supabase auth completamente cuando DEV_BYPASS_ADMIN_AUTH=1 — evita
  // el lookup DNS lento si el proyecto Supabase no está configurado.
  let user: { email?: string | null } | null = null;
  if (process.env.DEV_BYPASS_ADMIN_AUTH !== "1") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
    if (!user) redirect("/admin/login");
  }

  const [product, allCatalogs, assignedSlugs, allBrands, allFamilies] = await Promise.all([
    getProductByRef(ref).catch(() => null),
    listCatalogs(true).catch(() => []),
    getProductCatalogs(ref).catch(() => []),
    listBrands().catch(() => []),
    listFamiliesEntities().catch(() => []),
  ]);
  if (!product) notFound();

  const brandOptions = allBrands.map((b) => ({ slug: b.slug, name: b.name }));
  const familyOptions = allFamilies
    .filter((f) => f.is_entity !== false)
    .map((f) => ({ slug: f.slug, name: f.name }));

  // Mapeamos slugs asignados a IDs reales del catálogo
  const assignedIds = allCatalogs.filter((c) => assignedSlugs.includes(c.slug)).map((c) => c.id);

  const formInitial = mapFromApi(product);
  const scoreLocal = computeOptimizationScore(adaptApiProduct(product));
  const scoreServer = Math.min(100, product.optimization_score ?? scoreLocal.total);

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
            Ref. {product.ref}
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
                scoreServer >= 80
                  ? "text-emerald-600"
                  : scoreServer >= 50
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
              gallery={
                Array.isArray(product.gallery) && product.gallery.length > 0
                  ? product.gallery
                  : product.image_url
                    ? [product.image_url]
                    : []
              }
            />
          </section>
          <section className="rounded-2xl border border-border p-6 bg-background">
            <CatalogPicker
              productRef={product.ref}
              allCatalogs={allCatalogs}
              initialIds={assignedIds}
            />
          </section>
          <ProductEditForm
            productRef={product.ref}
            initial={formInitial}
            brandOptions={brandOptions}
            familyOptions={familyOptions}
            hasImage={
              !!product.image_url ||
              (Array.isArray(product.gallery) && product.gallery.length > 0)
            }
          />
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
