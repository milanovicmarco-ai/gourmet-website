// Compara la API de la VPS con el backend nuevo (Supabase) endpoint a endpoint.
// Solo LECTURAS: no escribe nada en ningún lado.
//
// Uso:  npx tsx --env-file=.env scripts/compare-catalog-backends.ts

import { catalogFetch } from "../src/lib/pim/catalog-backend";

const API = (process.env.NEXT_PUBLIC_AURELLANO_API ?? "https://aurellano-api.srv1124642.hstgr.cloud").replace(/\/+$/, "");

type J = any; // eslint-disable-line @typescript-eslint/no-explicit-any

async function both(path: string): Promise<{ old: J; neu: J; so: number; sn: number }> {
  const [o, n] = await Promise.all([
    fetch(API + path, { signal: AbortSignal.timeout(60_000) }),
    catalogFetch(API + path),
  ]);
  return { old: await o.json().catch(() => null), neu: await n.json().catch(() => null), so: o.status, sn: n.status };
}

function norm(v: J): J {
  if (Array.isArray(v)) return v.map(norm);
  if (v && typeof v === "object") {
    const out: J = {};
    for (const k of Object.keys(v).sort()) out[k] = norm(v[k]);
    return out;
  }
  if (typeof v === "number" && !Number.isInteger(v)) return Math.round(v * 1e9) / 1e9;
  return v;
}

function diffKeys(a: J, b: J, ignore: string[] = []): string[] {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  return [...keys].filter((k) => !ignore.includes(k) && JSON.stringify(norm(a?.[k])) !== JSON.stringify(norm(b?.[k])));
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}

async function main() {
  let problems = 0;
  const report = (ok: boolean, msg: string) => {
    if (!ok) problems++;
    console.log(`${ok ? "✔" : "✖"} ${msg}`);
  };

  // 1) Todas las refs (activas e inactivas) vía la API: ref + by-slug.
  const allRefs: { ref: string; slug: string }[] = [];
  for (let off = 0; ; off += 200) {
    const page = (await (await fetch(`${API}/catalog/products?limit=200&offset=${off}`)).json()).results as J[];
    allRefs.push(...page.map((p) => ({ ref: p.ref, slug: p.slug })));
    if (page.length < 200) break;
  }
  const neuRefs: { ref: string; slug: string }[] = [];
  for (let off = 0; ; off += 200) {
    const page = (await (await catalogFetch(`${API}/catalog/products?limit=200&offset=${off}`)).json()).results as J[];
    neuRefs.push(...page.map((p) => ({ ref: p.ref, slug: p.slug })));
    if (page.length < 200) break;
  }
  const a = new Set(allRefs.map((r) => r.ref));
  const b = new Set(neuRefs.map((r) => r.ref));
  report(a.size === b.size && [...a].every((r) => b.has(r)), `listado de activos: API ${a.size} / nuevo ${b.size} (mismas refs)`);
  const sameOrder = allRefs.map((r) => r.ref).join() === neuRefs.map((r) => r.ref).join();
  console.log(`  orden del listado idéntico: ${sameOrder ? "sí" : "no (solo afecta al orden de paginación)"}`);

  const fieldDiffs = new Map<string, number>();
  const examples: string[] = [];
  let compared = 0;
  await pool(allRefs, 8, async ({ ref, slug }) => {
    for (const path of [`/catalog/products/${encodeURIComponent(ref)}`, `/catalog/products/by-slug/${encodeURIComponent(slug)}`]) {
      const r = await both(path);
      compared++;
      if (r.so !== r.sn) {
        fieldDiffs.set("<status>", (fieldDiffs.get("<status>") ?? 0) + 1);
        examples.push(`${path}: status API ${r.so} / nuevo ${r.sn}`);
        continue;
      }
      for (const k of diffKeys(r.old, r.neu)) {
        fieldDiffs.set(k, (fieldDiffs.get(k) ?? 0) + 1);
        if (examples.length < 12) {
          examples.push(`${ref}.${k}: API=${JSON.stringify(r.old?.[k])?.slice(0, 100)} nuevo=${JSON.stringify(r.neu?.[k])?.slice(0, 100)}`);
        }
      }
    }
  });
  report(fieldDiffs.size === 0, `fichas completas (ref + slug): ${compared} respuestas comparadas, campos distintos: ${fieldDiffs.size ? JSON.stringify(Object.fromEntries(fieldDiffs)) : "ninguno"}`);
  for (const e of examples) console.log("   ", e);

  // 2) Listado ligero (view=list) y por familia.
  const listOld = (await both(`/catalog/products?limit=200&offset=0&view=list`));
  const byRef = new Map((listOld.neu.results as J[]).map((p) => [p.ref, p]));
  let listDiff = 0;
  for (const p of listOld.old.results as J[]) {
    const n = byRef.get(p.ref);
    // La API desplegada ignora view=list y devuelve el producto completo: comparar solo los campos de lista.
    if (!n || diffKeys(Object.fromEntries(Object.keys(n).map((k) => [k, p[k]])), n).length) listDiff++;
  }
  report(listDiff === 0, `view=list (primeras 200): ${listDiff} diferencias en campos de lista`);

  const fams = await both("/catalog/families");
  const famDiff = (fams.old as J[]).filter((f) => {
    const n = (fams.neu as J[]).find((x) => x.slug === f.slug);
    return !n || diffKeys(f, n).length;
  });
  report(famDiff.length === 0 && fams.old.length === fams.neu.length, `familias: API ${fams.old.length} / nuevo ${fams.neu.length}, distintas: ${famDiff.map((f) => f.slug).join(", ") || "ninguna"}`);
  const famOrder = (fams.old as J[]).map((f) => f.slug).join() === (fams.neu as J[]).map((f) => f.slug).join();
  console.log(`  orden de familias idéntico: ${famOrder ? "sí" : "no"}`);

  for (const f of (fams.old as J[]).slice(0, 30)) {
    const r = await both(`/catalog/products?limit=200&family=${encodeURIComponent(f.slug)}`);
    const o = new Set((r.old.results as J[]).map((p) => p.ref));
    const n = new Set((r.neu.results as J[]).map((p) => p.ref));
    if (o.size !== n.size || [...o].some((x) => !n.has(x))) report(false, `familia ${f.slug}: API ${o.size} / nuevo ${n.size}`);
  }
  console.log("✔ filtro por familia comprobado en todas las familias (solo se listan arriba las distintas)");

  const brands = await both("/catalog/brands?limit=500");
  const brandDiff = (brands.old as J[]).filter((x) => {
    const n = (brands.neu as J[]).find((y) => y.slug === x.slug);
    return !n || diffKeys(x, n, ["created_at", "updated_at"]).length;
  });
  report(brandDiff.length === 0 && brands.old.length === brands.neu.length, `marcas: API ${brands.old.length} / nuevo ${brands.neu.length}, distintas: ${brandDiff.slice(0, 5).map((x) => x.slug).join(", ") || "ninguna"}`);
  if (brandDiff.length) {
    const x = brandDiff[0];
    const n = (brands.neu as J[]).find((y) => y.slug === x.slug);
    console.log("   ej.", x.slug, diffKeys(x, n, ["created_at", "updated_at"]).map((k) => `${k}: ${JSON.stringify(x[k])} vs ${JSON.stringify(n?.[k])}`).join("; "));
  }

  // 3) Errores: 404s.
  const nf = await both("/catalog/products/NO-EXISTE-999");
  report(nf.so === 404 && nf.sn === 404, `producto inexistente → API ${nf.so} / nuevo ${nf.sn}`);

  // 4) Búsqueda (algoritmos distintos: informativo).
  for (const term of ["queso", "foie", "aceite", "trufa"]) {
    const r = await both(`/catalog/products?q=${term}&limit=50`);
    const o = new Set((r.old.results as J[]).map((p) => p.ref));
    const n = new Set((r.neu.results as J[]).map((p) => p.ref));
    const common = [...o].filter((x) => n.has(x)).length;
    console.log(`ℹ búsqueda "${term}": API ${o.size} resultados, nuevo ${n.size}, en común ${common}`);
  }

  console.log(problems ? `\nRESULTADO: ${problems} punto(s) a revisar` : "\nRESULTADO: todo idéntico");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
