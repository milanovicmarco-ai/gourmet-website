import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/integrations/supabase/server";
import { computeOptimizationScore } from "@/lib/pim/score";
import { ProductEditForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !product) notFound();

  const score = computeOptimizationScore(product as never);

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
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{product.ref}</p>
          <h1 className="font-display font-light text-3xl md:text-4xl tracking-tight mt-1">
            {product.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Última edición: {new Date(product.updated_at).toLocaleDateString("es-ES")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Score de optimización
          </p>
          <p className="font-display font-light text-4xl mt-1 tabular-nums">
            <span
              className={
                score.total >= 80
                  ? "text-emerald-600"
                  : score.total >= 50
                    ? "text-amber-600"
                    : "text-destructive"
              }
            >
              {score.total}
            </span>
            <span className="text-muted-foreground text-2xl">/100</span>
          </p>
        </div>
      </header>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <ProductEditForm product={product} />
        </div>
        <aside className="lg:col-span-4">
          <div className="sticky top-6 space-y-6">
            <div className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-3">
              <h2 className="font-display font-medium">Checklist de optimización</h2>
              <ul className="space-y-2">
                {score.criteria.map((c) => (
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
            </div>
            {product.primary_image && (
              <div className="rounded-2xl border border-border overflow-hidden bg-secondary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.primary_image}
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
