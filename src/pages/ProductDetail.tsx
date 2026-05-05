"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { ProductCard } from "@/components/ProductCard";
import { getProduct, products, allergenIcons } from "@/lib/products";
import { waLink } from "@/lib/contact";
import { cn } from "@/lib/utils";

interface ProductDetailProps {
  slug: string;
}

const ProductDetail = ({ slug }: ProductDetailProps) => {
  const product = slug ? getProduct(slug) : undefined;
  const [activeImg, setActiveImg] = useState(0);

  if (!product) {
    notFound();
    return null;
  }

  const gallery = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image];

  const related = products.filter((p) => p.slug !== product.slug && p.category === product.category).slice(0, 3);
  const filler = products.filter((p) => p.slug !== product.slug).slice(0, 3 - related.length);
  const cross = [...related, ...filler].slice(0, 3);

  const productTitle = `${product.name} | Aurellano P. Gastronómicos`.slice(0, 60);
  const productDesc = (product.description || "").slice(0, 155);

  return (
    <Layout seoTitle={productTitle} seoDescription={productDesc}>
      <section className="container-edit pt-10 md:pt-16">
        <nav aria-label="breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="hover:text-foreground transition-colors">Inicio</Link></li>
            <li aria-hidden>/</li>
            <li><Link href="/catalogo" className="hover:text-foreground transition-colors">Catálogo</Link></li>
            <li aria-hidden>/</li>
            <li><span className="text-foreground/80">{product.category}</span></li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-foreground font-medium truncate max-w-[55vw] sm:max-w-none">{product.name}</li>
          </ol>
        </nav>
      </section>

      <section className="container-edit pt-8 pb-20 md:pb-28 grid lg:grid-cols-12 gap-12 lg:gap-16 relative">
        <Circle variant="accent" className="w-72 h-72 -top-20 -right-20 hidden lg:block" />

        <div className="lg:col-span-7 relative space-y-4">
          <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-secondary">
            <img src={gallery[activeImg]} alt={product.name} className="h-full w-full object-cover transition-opacity duration-500" />
          </div>
          {gallery.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {gallery.map((g, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  className={cn(
                    "aspect-square rounded-2xl overflow-hidden bg-secondary border-2 transition-all",
                    activeImg === i ? "border-accent" : "border-transparent hover:border-border"
                  )}
                  aria-label={`Ver imagen ${i + 1}`}
                >
                  <img src={g} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {product.badges && (
            <div className="flex flex-wrap gap-2 pt-2">
              {product.badges.map((b) => (
                <span key={b} className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground">{b}</span>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-7">
          <div className="space-y-3">
            <p className="eyebrow">{product.category}</p>
            <h1 className="font-display font-light text-4xl md:text-5xl tracking-tight leading-[1.05] text-balance">{product.name}</h1>
            <p className="text-muted-foreground">{product.brand} · Ref. {product.ref}</p>
          </div>

          <p className="text-base md:text-lg leading-relaxed text-muted-foreground">{product.description}</p>

          <dl className="grid grid-cols-2 gap-y-5 gap-x-6 border-t border-border pt-6 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Origen</dt>
              <dd className="mt-1 font-medium">{product.origin}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Formato</dt>
              <dd className="mt-1 font-medium">{product.format}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sabor</dt>
              <dd className="mt-1 font-medium">{product.flavor}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">Alérgenos</dt>
              <dd className="flex flex-wrap gap-2">
                {product.allergens.length === 0 ? (
                  <span className="text-xs px-3 py-1.5 rounded-full bg-accent/10 text-accent border border-accent/20">Sin alérgenos declarados</span>
                ) : (
                  product.allergens.map((a) => (
                    <span key={a} className="text-xs px-3 py-1.5 rounded-full bg-secondary border border-border capitalize">
                      <span className="mr-1.5">{allergenIcons[a] ?? "•"}</span>
                      {a}
                    </span>
                  ))
                )}
              </dd>
            </div>
          </dl>

          <a
            href={waLink(`Hola Aurellano, me interesa: ${product.name} (${product.ref}).`)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:bg-accent transition-colors"
          >
            <MessageCircle className="h-5 w-5" /> Pedir información
          </a>
        </div>
      </section>

      {/* DESCRIPCIÓN LARGA + MARCA + NUTRICIONAL */}
      {(product.longDescription || product.brandStory || product.nutrition) && (
        <section className="border-t border-border">
          <div className="container-edit py-20 md:py-24 grid lg:grid-cols-12 gap-12 lg:gap-16">
            <div className="lg:col-span-7 space-y-12">
              {product.longDescription && (
                <div className="space-y-4">
                  <p className="eyebrow">Sobre el producto</p>
                  <h2 className="font-display font-light text-3xl md:text-4xl tracking-tight">El detalle</h2>
                  <p className="text-base md:text-lg leading-relaxed text-muted-foreground whitespace-pre-line">
                    {product.longDescription}
                  </p>
                </div>
              )}

              {product.brandStory && (
                <div className="space-y-4 border-t border-border pt-12">
                  <p className="eyebrow">La marca</p>
                  <h2 className="font-display font-light text-3xl md:text-4xl tracking-tight">{product.brand}</h2>
                  <p className="text-base md:text-lg leading-relaxed text-muted-foreground">
                    {product.brandStory}
                  </p>
                </div>
              )}

              {product.pairings && product.pairings.length > 0 && (
                <div className="space-y-4 border-t border-border pt-12">
                  <p className="eyebrow">Maridajes</p>
                  <ul className="flex flex-wrap gap-2">
                    {product.pairings.map((p) => (
                      <li key={p} className="text-sm px-4 py-2 rounded-full bg-secondary border border-border">
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {product.nutrition && (
              <aside className="lg:col-span-5">
                <div className="sticky top-28 rounded-3xl border border-border bg-secondary/40 p-8 space-y-5">
                  <div className="flex items-end justify-between border-b border-border pb-4">
                    <h3 className="font-display font-light text-2xl tracking-tight">Información nutricional</h3>
                  </div>
                  {product.nutrition.serving && (
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Por {product.nutrition.serving}
                    </p>
                  )}
                  <dl className="divide-y divide-border text-sm">
                    {[
                      { label: "Energía", value: product.nutrition.energyKcal ? `${product.nutrition.energyKcal} kcal` : null },
                      { label: "Grasas", value: product.nutrition.fat },
                      { label: "  de las cuales saturadas", value: product.nutrition.saturatedFat },
                      { label: "Hidratos de carbono", value: product.nutrition.carbs },
                      { label: "  de los cuales azúcares", value: product.nutrition.sugars },
                      { label: "Proteínas", value: product.nutrition.protein },
                      { label: "Sal", value: product.nutrition.salt },
                    ]
                      .filter((r) => r.value)
                      .map((r) => (
                        <div key={r.label} className="flex items-center justify-between py-3">
                          <dt className="text-muted-foreground whitespace-pre">{r.label}</dt>
                          <dd className="font-medium">{r.value}</dd>
                        </div>
                      ))}
                  </dl>
                </div>
              </aside>
            )}
          </div>
        </section>
      )}

      {/* CROSS-SELLING */}
      <section className="bg-secondary/40 border-t border-border">
        <div className="container-edit py-20 md:py-24">
          <div className="flex items-end justify-between mb-10">
            <h2 className="font-display font-light text-3xl md:text-4xl">Combina con…</h2>
            <Link href="/catalogo" className="text-sm font-medium hover:text-accent">Ver más →</Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {cross.map((p) => (
              <ProductCard key={p.slug} image={p.image} title={p.name} category={p.category} origin={p.origin} href={`/producto/${p.slug}`} />
            ))}
          </div>

          <div className="mt-16 rounded-3xl bg-accent text-accent-foreground p-10 text-center relative overflow-hidden">
            <Circle variant="outline" className="w-72 h-72 -top-20 -right-20 border-accent-foreground/20" />
            <div className="relative space-y-4 max-w-xl mx-auto">
              <h3 className="font-display font-light text-3xl">Pedido mínimo 200€</h3>
              <p className="text-sm text-accent-foreground/85">Portes incluidos según zona. Entrega en 24–48h en Cataluña.</p>
              <Link href="/condiciones" className="inline-flex items-center gap-2 underline underline-offset-4 text-sm font-medium">Ver condiciones de venta</Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ProductDetail;
