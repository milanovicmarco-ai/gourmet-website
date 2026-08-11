"use server";

import { createClient } from "@/integrations/supabase/server";
import { redirect } from "next/navigation";
import { fetchAllProducts } from "@/lib/pim/api";
import { getMetasForProducts, effectiveBrand } from "@/lib/pim/product-meta";
import { ensureBrandExists } from "@/lib/pim/ensure-brand";

export type SyncResult = {
  synced: string[];
  alreadyExisted: string[];
  failed: { name: string; reason: string }[];
};

export async function syncBrandsToPartner(): Promise<SyncResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Recoge todas las marcas únicas del catálogo (misma lógica que la página).
  const products = await fetchAllProducts().catch(() => []);
  const metas = await getMetasForProducts(products.map((p) => p.ref)).catch(() => ({}));

  const uniqueNames = new Set<string>();
  for (const p of products) {
    const b = effectiveBrand(metas[p.ref], p.brand);
    if (b) uniqueNames.add(b.trim());
  }

  const result: SyncResult = { synced: [], alreadyExisted: [], failed: [] };

  // Para cada marca, ensureBrandExists ya detecta si existe o la crea.
  // Procesamos en grupos de 5 para no saturar el partner.
  const names = Array.from(uniqueNames);
  const BATCH = 5;
  for (let i = 0; i < names.length; i += BATCH) {
    await Promise.all(
      names.slice(i, i + BATCH).map(async (name) => {
        const r = await ensureBrandExists(name);
        if (r.ok) {
          // ensureBrandExists devuelve ok=true tanto si ya existía como si la creó.
          // No podemos distinguir fácilmente, así que lo metemos en synced.
          result.synced.push(name);
        } else {
          result.failed.push({ name, reason: r.reason });
        }
      }),
    );
  }

  return result;
}
