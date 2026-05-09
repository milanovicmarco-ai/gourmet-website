import type { Metadata } from "next";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { listProducts, listFamilies } from "@/lib/pim/api";
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

const PAGE_LIMIT = 200;

type SP = {
  q?: string;
  family?: string;
  sin_gluten?: string;
  sin_lactosa?: string;
};

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const family = sp.family?.trim() || undefined;
  const onlySinGluten = sp.sin_gluten === "1";
  const onlySinLactosa = sp.sin_lactosa === "1";

  let products: Awaited<ReturnType<typeof listProducts>>["results"] = [];
  let families: Awaited<ReturnType<typeof listFamilies>> = [];
  let error: string | null = null;

  try {
    const [pr, fa] = await Promise.all([
      listProducts({ limit: PAGE_LIMIT, q, family, revalidate: 300 }),
      listFamilies(),
    ]);
    products = pr.results;
    families = fa;
  } catch (e) {
    error = (e as Error).message;
  }

  // Filtros adicionales que la API no soporta como query: aplicamos en memoria.
  const filtered = products.filter((p) => {
    if (onlySinGluten && !p.sin_gluten) return false;
    if (onlySinLactosa && !p.sin_lactosa) return false;
    return true;
  });

  const totalActive = [q, family, onlySinGluten, onlySinLactosa].filter(Boolean).length;

  return (
    <Layout navTheme="light">
      <section className="container-edit pt-12 md:pt-20 pb-10 md:pb-14">
        <div className="max-w-4xl space-y-6">
          <p className="eyebrow">Catálogo</p>
          <h1 className="display text-balance">
            Encuentra el producto<br />
            <span className="italic font-light text-accent">como tú trabajas.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl text-pretty">
            Filtra por familia, alérgeno o búsqueda libre. Si no lo encuentras, lo conseguimos.
          </p>
        </div>
      </section>

      <section className="container-edit pb-8">
        <form className="grid gap-3 md:grid-cols-[1fr_220px_auto] items-end max-w-4xl">
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
          <label className="block space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Familia</span>
            <select
              name="family"
              defaultValue={family ?? ""}
              className="w-full bg-background border border-border rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
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
            className="bg-primary text-primary-foreground rounded-full px-7 py-3 font-medium hover:bg-accent transition-colors"
          >
            Filtrar
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 mt-4 max-w-4xl">
          <FilterToggle name="sin_gluten" active={onlySinGluten} q={q} family={family} sin_lactosa={onlySinLactosa}>
            Sin gluten
          </FilterToggle>
          <FilterToggle name="sin_lactosa" active={onlySinLactosa} q={q} family={family} sin_gluten={onlySinGluten}>
            Sin lactosa
          </FilterToggle>
          {totalActive > 0 && (
            <Link
              href="/catalogo"
              className="ml-auto inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar filtros
            </Link>
          )}
        </div>
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
                {products.length === PAGE_LIMIT && (
                  <> (máx. {PAGE_LIMIT} mostrados — afina con búsqueda o familia)</>
                )}
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
                category={p.family ?? "—"}
                origin={p.origen ?? undefined}
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

function FilterToggle({
  name,
  active,
  children,
  q,
  family,
  sin_gluten,
  sin_lactosa,
}: {
  name: "sin_gluten" | "sin_lactosa";
  active: boolean;
  children: React.ReactNode;
  q?: string;
  family?: string;
  sin_gluten?: boolean;
  sin_lactosa?: boolean;
}) {
  // Construye el href manteniendo los demás filtros y togglea este.
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (family) params.set("family", family);
  if (sin_gluten && name !== "sin_gluten") params.set("sin_gluten", "1");
  if (sin_lactosa && name !== "sin_lactosa") params.set("sin_lactosa", "1");
  if (!active) params.set(name, "1");
  const qs = params.toString();
  const href = `/catalogo${qs ? `?${qs}` : ""}`;
  return (
    <Link
      href={href}
      className={`text-sm px-4 py-2 rounded-full border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-foreground border-border hover:border-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
