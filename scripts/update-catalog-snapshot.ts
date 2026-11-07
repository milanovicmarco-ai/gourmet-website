// Genera la "foto" del catálogo público: src/data/catalog-snapshot.json.
//
// La web la usa SOLO como respaldo: si la API del catálogo (VPS + Neon) falla,
// las fichas, listados y el índice del catálogo se sirven desde este archivo en
// vez de quedarse vacíos. Mientras la API responde, la foto no se usa.
//
// Uso:  npm run snapshot
// Repetir cuando haya cambios importantes en el catálogo (y antes de apagar la API).

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { isPublished, type ApiProduct } from "../src/lib/pim/api";

const API =
  process.env.NEXT_PUBLIC_AURELLANO_API ?? "https://aurellano-api.srv1124642.hstgr.cloud";
const OUT = resolve(__dirname, "../src/data/catalog-snapshot.json");
const PAGE = 200;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function main() {
  const byRef = new Map<string, ApiProduct>();
  for (let offset = 0; ; offset += PAGE) {
    const { results } = await getJson<{ results: ApiProduct[] }>(
      `/catalog/products?limit=${PAGE}&offset=${offset}`,
    );
    for (const p of results) byRef.set(p.ref, p);
    if (results.length < PAGE) break;
    if (offset > 10_000) throw new Error("demasiadas páginas: ¿la API ignora offset?");
  }

  const products = [...byRef.values()]
    .filter(isPublished)
    .sort((a, b) => a.ref.localeCompare(b.ref, "es", { numeric: true }));
  const families = await getJson<unknown[]>("/catalog/families");

  // Comprobaciones mínimas: no guardar una foto rota encima de una buena.
  if (products.length < 100) throw new Error(`solo ${products.length} productos publicados: abortado`);
  if (!Array.isArray(families) || families.length === 0) throw new Error("sin familias: abortado");

  const snapshot = { generated_at: new Date().toISOString(), source: API, products, families };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(snapshot));
  const kb = Math.round(JSON.stringify(snapshot).length / 1024);
  console.log(`OK: ${products.length} productos publicados, ${families.length} familias → ${OUT} (${kb} KB)`);
}

main().catch((e) => {
  console.error("ERROR:", (e as Error).message);
  process.exit(1);
});
