"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { waLink } from "@/lib/contact";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { ApiProduct } from "@/lib/pim/api";

interface ProductDetailProps {
  product: ApiProduct;
  /** Slug crudo de la familia (para enlazar al catálogo filtrado). */
  familySlug?: string | null;
  /** Display name resuelto desde el overlay families_meta (con fallback humanizado). */
  familyDisplay?: string | null;
}

const ProductDetail = ({ product, familySlug, familyDisplay }: ProductDetailProps) => {
  const { t } = useI18n();
  const allergens = typeof product.alergenos === "string"
    ? product.alergenos.split(",").map((s) => s.trim()).filter(Boolean)
    : Array.isArray(product.alergenos) ? product.alergenos : [];

  const tags = product.tags ?? [];
  const pairings = product.pairings ?? [];
  const formato = product.formato_opciones?.[0]?.label ?? "";
  const unitsPerBox = product.units_per_box ?? null;
  const family = product.family ?? "";
  const nutrition = product.info_nutricional;
  // Texto libre escrito por el editor del PIM viaja como { texto: "..." } por
  // exigencia de schema de la API. Lo desenvolvemos aquí para renderizarlo
  // como párrafo y no como tabla key/value.
  const nutritionText: string | null = (() => {
    if (typeof nutrition === "string" && nutrition.trim().length > 0) return nutrition;
    if (nutrition && typeof nutrition === "object" && !Array.isArray(nutrition)) {
      const obj = nutrition as Record<string, unknown>;
      if (typeof obj.texto === "string" && obj.texto.trim().length > 0) return obj.texto;
    }
    return null;
  })();
  const nutritionAsTable: Record<string, unknown> | null = (() => {
    if (!nutrition || typeof nutrition !== "object" || Array.isArray(nutrition)) return null;
    const obj = nutrition as Record<string, unknown>;
    // Si la única clave es `texto`, ya está cubierto por nutritionText.
    const keys = Object.keys(obj).filter((k) => k !== "texto");
    if (keys.length === 0) return null;
    return obj;
  })();

  // Galería: usa la `gallery` real si llega, si no, sólo `image_url`. Deduplica por si acaso.
  const gallery: string[] = Array.from(
    new Set(
      Array.isArray(product.gallery) && product.gallery.length > 0
        ? product.gallery
        : product.image_url
          ? [product.image_url]
          : [],
    ),
  );
  const [activeImg, setActiveImg] = useState(0);
  const activeUrl = gallery[activeImg] ?? null;

  return (
    <Layout>
      <section className="container-edit pt-28 md:pt-36">
        <nav aria-label="breadcrumb" className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="hover:text-foreground transition-colors">{t("Inicio")}</Link></li>
            <li aria-hidden>/</li>
            <li><Link href="/catalogo" className="hover:text-foreground transition-colors">{t("Catálogo")}</Link></li>
            {family && (
              <>
                <li aria-hidden>/</li>
                <li>
                  {familySlug ? (
                    <Link
                      href={`/catalogo?family=${encodeURIComponent(familySlug)}`}
                      className="text-foreground/80 hover:text-accent transition-colors"
                    >
                      {familyDisplay ?? family}
                    </Link>
                  ) : (
                    <span className="text-foreground/80">{familyDisplay ?? family}</span>
                  )}
                </li>
              </>
            )}
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-foreground font-medium truncate max-w-[55vw] sm:max-w-none">
              {product.name}
            </li>
          </ol>
        </nav>
      </section>

      <section className="container-edit pt-8 pb-20 md:pb-28 grid lg:grid-cols-12 gap-12 lg:gap-16 relative">
        <Circle variant="accent" className="w-72 h-72 -top-20 -right-20 hidden lg:block" />

        <div className="lg:col-span-7 relative space-y-4">
          {/* Imagen principal (la seleccionada en la galería) */}
          <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-secondary">
            {activeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeUrl}
                alt={product.name}
                className="h-full w-full object-cover transition-opacity duration-500"
              />
            ) : (
              <div className="h-full w-full grid place-items-center text-muted-foreground text-sm">
                {t("Sin imagen")}
              </div>
            )}
          </div>

          {/* Miniaturas de la galería (sólo si hay más de una imagen) */}
          {gallery.length > 1 && (
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 gap-2.5">
              {gallery.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  aria-label={`Ver imagen ${i + 1} de ${gallery.length}`}
                  className={cn(
                    "aspect-square rounded-xl overflow-hidden bg-secondary border-2 transition-all",
                    activeImg === i
                      ? "border-accent"
                      : "border-transparent hover:border-border",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {tags.map((b) => (
                <span key={b} className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground">
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-7">
          <div className="space-y-3">
            {family && <p className="eyebrow">{familyDisplay ?? family}</p>}
            <h1 className="font-display font-light text-4xl md:text-5xl tracking-tight leading-[1.05] text-balance">
              {product.name}
            </h1>
            <p className="text-muted-foreground">{t("Ref.")} {product.ref}</p>
          </div>

          {product.descripcion_corta && (
            <p className="text-base md:text-lg leading-relaxed text-muted-foreground">
              {product.descripcion_corta}
            </p>
          )}

          <dl className="grid grid-cols-2 gap-y-5 gap-x-6 border-t border-border pt-6 text-sm">
            {product.brand && (
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("Marca")}</dt>
                <dd className="mt-1 font-medium">{product.brand}</dd>
              </div>
            )}
            {product.origen && (
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("Origen")}</dt>
                <dd className="mt-1 font-medium">{product.origen}</dd>
              </div>
            )}
            {formato && (
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("Formato unitario")}</dt>
                <dd className="mt-1 font-medium">{formato}</dd>
              </div>
            )}
            {unitsPerBox != null && (
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("Unidades por caja")}</dt>
                <dd className="mt-1 font-medium">{unitsPerBox} {t("u/caja")}</dd>
              </div>
            )}
            {product.flavor && (
              <div className="col-span-2">
                <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("Sabor")}</dt>
                <dd className="mt-1 font-medium">{product.flavor}</dd>
              </div>
            )}
            <div className="col-span-2">
              <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">{t("Alérgenos")}</dt>
              <dd className="flex flex-wrap gap-2">
                {allergens.length === 0 ? (
                  <span className="text-xs px-3 py-1.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                    {t("Sin alérgenos declarados")}
                  </span>
                ) : (
                  allergens.map((a) => (
                    <span key={a} className="text-xs px-3 py-1.5 rounded-full bg-secondary border border-border capitalize">
                      {a}
                    </span>
                  ))
                )}
              </dd>
            </div>
          </dl>

          <a
            href={waLink(`${t("Hola Aurellano, me interesa")}: ${product.name} (${product.ref}).`)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:bg-accent transition-colors"
          >
            <MessageCircle className="h-5 w-5" /> {t("Pedir información")}
          </a>
        </div>
      </section>

      {(product.description_rich || pairings.length > 0 || !!product.ingredientes || !!nutritionText || !!nutritionAsTable) && (
        <section className="border-t border-border">
          <div className="container-edit py-20 md:py-24 grid lg:grid-cols-12 gap-12 lg:gap-16">
            <div className="lg:col-span-7 space-y-12">
              {product.description_rich && (
                <div className="space-y-4">
                  <p className="eyebrow">{t("Sobre el producto")}</p>
                  <h2 className="font-display font-light text-3xl md:text-4xl tracking-tight">{t("El detalle")}</h2>
                  <div className="prose prose-base max-w-none text-muted-foreground prose-p:my-8 prose-p:leading-relaxed prose-strong:text-foreground prose-headings:font-display prose-headings:font-light prose-headings:mt-12 prose-headings:mb-6 prose-li:my-2 prose-ul:my-6 prose-a:text-accent prose-a:no-underline hover:prose-a:underline">
                    <ReactMarkdown>{product.description_rich}</ReactMarkdown>
                  </div>
                </div>
              )}

              {pairings.length > 0 && (
                <div className="space-y-4 border-t border-border pt-12">
                  <p className="eyebrow">{t("Maridajes")}</p>
                  <ul className="flex flex-wrap gap-2">
                    {pairings.map((p) => (
                      <li key={p} className="text-sm px-4 py-2 rounded-full bg-secondary border border-border">
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Sidebar con bloques apilados: Ingredientes arriba, Información nutricional debajo. */}
            {(product.ingredientes || nutritionAsTable || nutritionText) && (
              <aside className="lg:col-span-5">
                <div className="sticky top-28 space-y-6">
                  {product.ingredientes && (
                    <div className="rounded-3xl border border-border bg-secondary/40 p-8 space-y-5">
                      <h3 className="font-display font-light text-2xl tracking-tight border-b border-border pb-4">
                        {t("Ingredientes")}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                        {product.ingredientes}
                      </p>
                    </div>
                  )}

                  {(nutritionAsTable || nutritionText) && (
                    <div className="rounded-3xl border border-border bg-secondary/40 p-8 space-y-5">
                      <h3 className="font-display font-light text-2xl tracking-tight border-b border-border pb-4">
                        {t("Información nutricional")}
                      </h3>
                      {nutritionAsTable && (
                        <dl className="divide-y divide-border text-sm">
                          {Object.entries(nutritionAsTable)
                            .filter(([k, v]) => k !== "texto" && v !== null && v !== undefined && v !== "")
                            .map(([k, v]) => (
                              <div key={k} className="flex items-center justify-between py-3">
                                <dt className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</dt>
                                <dd className="font-medium">{String(v)}</dd>
                              </div>
                            ))}
                        </dl>
                      )}
                      {nutritionText && (
                        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                          {nutritionText}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </aside>
            )}
          </div>
        </section>
      )}

      {/* CTA final — fondo blanco continuo con la sección anterior, enfocado a
          comunicar el surtido (+10.000 referencias) y abrir conversación. */}
      <section className="bg-background">
        <div className="container-edit pb-20 md:pb-28 pt-4 text-center">
          <div className="max-w-2xl mx-auto space-y-5">
            <p className="eyebrow justify-center inline-flex text-accent">
              {t("+10.000 referencias")}
            </p>
            <h3 className="font-display font-light text-3xl md:text-4xl text-balance">
              {t("¿Buscas más información o un producto concreto?")}
            </h3>
            <p className="text-base text-muted-foreground">
              {t(
                "Tenemos más de 10.000 referencias en catálogo y trabajamos con +200 proveedores. Si tienes dudas, buscas un producto específico o quieres realizar un pedido, habla con nuestro equipo comercial.",
              )}
            </p>
            <a
              href={waLink(
                `${t("Hola Aurellano, querría hablar con comercial sobre")} ${product.name} (${product.ref}).`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full pl-6 pr-7 py-4 font-medium hover:bg-accent transition-colors"
            >
              <MessageCircle className="h-5 w-5" /> {t("Hablar con comercial")}
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ProductDetail;
