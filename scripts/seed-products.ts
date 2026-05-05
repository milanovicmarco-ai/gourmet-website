/**
 * Seed inicial del PIM.
 *
 * Toma los productos hardcodeados de src/lib/products.ts y los vuelca en Supabase.
 * Necesita SUPABASE_SERVICE_ROLE_KEY en .env (server-only) para bypass del RLS.
 *
 * Ejecutar desde la raíz del proyecto:
 *   npm run seed
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { products } from "../src/lib/products";
import { computeOptimizationScore } from "../src/lib/pim/score";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("✖ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// Categorías que aparecen en el array fuente. Las creamos como upsert.
const SOURCE_CATEGORIES = ["Quesos", "Foie", "Conservas", "Platos preparados", "Despensa", "Especial Sin"] as const;

async function upsertCategories() {
  const rows = SOURCE_CATEGORIES.map((name, i) => ({
    slug: slugify(name),
    name,
    sort_order: i,
  }));
  const { data, error } = await supabase
    .from("categories")
    .upsert(rows, { onConflict: "slug" })
    .select("id, slug");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r) => [r.slug, r.id]));
}

async function upsertBrands() {
  const seen = new Map<string, string>();
  for (const p of products) {
    const slug = slugify(p.brand);
    if (!seen.has(slug)) seen.set(slug, p.brand);
  }
  const rows = Array.from(seen.entries()).map(([slug, name]) => ({
    slug,
    name,
    story: products.find((p) => slugify(p.brand) === slug)?.brandStory ?? null,
  }));
  const { data, error } = await supabase
    .from("brands")
    .upsert(rows, { onConflict: "slug" })
    .select("id, slug");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r) => [r.slug, r.id]));
}

async function upsertProducts(catMap: Record<string, string>, brandMap: Record<string, string>) {
  const rows = products.map((p) => {
    const galleryStrings = (p.gallery ?? []).map((g) => (typeof g === "string" ? g : ""));
    const primary = typeof p.image === "string" ? p.image : "";
    const base = {
      slug: p.slug,
      name: p.name,
      ref: p.ref ?? null,
      brand_id: brandMap[slugify(p.brand)] ?? null,
      category_id: catMap[slugify(p.category)] ?? null,
      short_description: p.description ?? null,
      long_description: p.longDescription ?? null,
      origin: p.origin ?? null,
      flavor: p.flavor ?? null,
      format: p.format ?? null,
      price_eur: p.price ?? null,
      primary_image: primary,
      gallery: galleryStrings,
      allergens: p.allergens ?? [],
      badges: p.badges ?? [],
      pairings: p.pairings ?? [],
      client_types: p.clientTypes ?? [],
      dish_types: p.dishTypes ?? [],
      food_category: p.foodCategory ?? null,
      specialties: p.specialties ?? [],
      vegan: !!p.vegan,
      gluten_free: !!p.glutenFree,
      lactose_free: !!p.lactoseFree,
      nutrition: p.nutrition ?? null,
      status: "published" as const,
      seo_title: `${p.name} | Aurellano Productos Gastronómicos`.slice(0, 60),
      seo_description: (p.description || "").slice(0, 155),
    };
    const { total } = computeOptimizationScore(base as never);
    return { ...base, optimization_score: total };
  });

  const { error } = await supabase.from("products").upsert(rows, { onConflict: "slug" });
  if (error) throw error;
  return rows.length;
}

async function main() {
  console.log("→ Upserting categorías…");
  const catMap = await upsertCategories();
  console.log(`  ✓ ${Object.keys(catMap).length} categorías`);

  console.log("→ Upserting marcas…");
  const brandMap = await upsertBrands();
  console.log(`  ✓ ${Object.keys(brandMap).length} marcas`);

  console.log("→ Upserting productos…");
  const count = await upsertProducts(catMap, brandMap);
  console.log(`  ✓ ${count} productos`);
  console.log("");
  console.log("✔ Seed completado.");
}

main().catch((err) => {
  console.error("✖ Seed falló:", err);
  process.exit(1);
});
