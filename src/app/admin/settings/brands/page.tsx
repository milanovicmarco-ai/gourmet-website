import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/integrations/supabase/server";
import { fetchAllProducts } from "@/lib/pim/api";
import { getMetasForProducts, effectiveBrand } from "@/lib/pim/product-meta";
import { BrandsManager } from "./brands-manager";

export const dynamic = "force-dynamic";

export default async function SettingsBrandsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Calcula la lista de marcas únicas vistas en TODO el catálogo (override + API).
  // Agrupamos case-insensitive y guardamos la primera capitalización vista como canonical.
  const products = await fetchAllProducts().catch(() => []);
  const metas = await getMetasForProducts(products.map((p) => p.ref)).catch(() => ({}));

  type BrandRow = { canonical: string; count: number; refs: string[] };
  const map = new Map<string, BrandRow>(); // key = lowercase trimmed
  for (const p of products) {
    const b = effectiveBrand(metas[p.ref], p.brand);
    if (!b) continue;
    const key = b.toLowerCase().trim();
    const existing = map.get(key);
    if (existing) {
      existing.count++;
      existing.refs.push(p.ref);
    } else {
      map.set(key, { canonical: b, count: 1, refs: [p.ref] });
    }
  }
  const brands = Array.from(map.values()).sort((a, b) =>
    a.canonical.localeCompare(b.canonical),
  );

  return (
    <div className="px-5 md:px-10 py-8 space-y-8 max-w-5xl">
      <Link
        href="/admin/settings"
        className="text-xs text-muted-foreground hover:text-accent transition-colors uppercase tracking-[0.18em]"
      >
        ← Volver a settings
      </Link>

      <header>
        <p className="eyebrow">PIM · Settings · Marcas</p>
        <h1 className="font-display font-light text-3xl md:text-4xl tracking-tight mt-1">
          Marcas distribuidas
        </h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-3xl">
          Las marcas viven como texto libre en el overlay (<code>product_meta.brand_override</code>).
          Aquí ves la lista deduplicada (case-insensitive) con cuántos productos usan cada una.
          Puedes <strong>renombrar</strong> una marca y se actualiza en todos los productos a la vez,
          o <strong>quitarla</strong> de todos los productos que la tengan asignada.
        </p>
      </header>

      <BrandsManager brands={brands} totalProducts={products.length} />
    </div>
  );
}
