import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/integrations/supabase/server";
import { computeOptimizationScore } from "@/lib/pim/score";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: rows, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, ref, primary_image, status, optimization_score, short_description, long_description, gallery, allergens, badges, pairings, nutrition, price_eur, format, origin, brand_id, category_id, seo_title, seo_description, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <div className="p-8">
        <h1 className="font-display font-light text-2xl mb-3">Productos</h1>
        <p className="text-destructive">Error cargando productos: {error.message}</p>
        <p className="text-sm text-muted-foreground mt-2">
          ¿Has corrido la migración SQL y el seed? Ver{" "}
          <code className="bg-secondary px-2 py-0.5 rounded text-xs">supabase/migrations/</code> y{" "}
          <code className="bg-secondary px-2 py-0.5 rounded text-xs">npm run seed</code>.
        </p>
      </div>
    );
  }

  const total = rows?.length ?? 0;
  const avgScore = total > 0
    ? Math.round((rows!.reduce((acc, r) => acc + (r.optimization_score ?? 0), 0) / total))
    : 0;

  return (
    <div className="px-5 md:px-10 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">PIM · Catálogo</p>
          <h1 className="font-display font-light text-3xl md:text-4xl tracking-tight mt-1">
            Productos
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {total} producto{total !== 1 ? "s" : ""} · score medio{" "}
            <span className="font-medium text-foreground">{avgScore}/100</span>
          </p>
        </div>
        <button
          type="button"
          disabled
          className="rounded-full bg-secondary text-muted-foreground border border-border px-5 py-2.5 text-sm cursor-not-allowed"
          title="Próximamente: alta de producto desde el dashboard"
        >
          + Nuevo producto
        </button>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden bg-background">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Producto</th>
              <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Ref</th>
              <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Estado</th>
              <th className="text-left px-4 py-3 font-semibold">Score</th>
              <th className="text-right px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((p) => {
              const liveScore = computeOptimizationScore(p as never).total;
              return (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {p.primary_image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.primary_image}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover bg-secondary shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.ref || "—"}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <StatusPill status={p.status} />
                  </td>
                  <td className="px-4 py-3">
                    <ScoreBar value={liveScore} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-sm font-medium text-accent hover:underline"
                    >
                      Editar →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {total === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No hay productos todavía. Lanza el seed con{" "}
                  <code className="bg-secondary px-2 py-0.5 rounded text-xs">npm run seed</code>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
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
  const color =
    value >= 80
      ? "bg-emerald-500"
      : value >= 50
        ? "bg-amber-500"
        : "bg-destructive";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="relative h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
        <div className={`absolute inset-y-0 left-0 ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs tabular-nums text-foreground w-9 text-right">{value}</span>
    </div>
  );
}
