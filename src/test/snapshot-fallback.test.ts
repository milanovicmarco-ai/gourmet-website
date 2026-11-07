import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchAllProducts, getProductByRef, getProductBySlug, listFamilies, listProducts } from "@/lib/pim/api";
import snapshot from "@/data/catalog-snapshot.json";

// API caída: cualquier fetch falla como si la VPS/Neon no respondieran.
function apiDown() {
  const orig = globalThis.fetch;
  globalThis.fetch = (async () => { throw new TypeError("fetch failed"); }) as typeof fetch;
  return () => { globalThis.fetch = orig; };
}

const sample = snapshot.products[0];

test("la foto tiene un catálogo completo y publicado", () => {
  assert.ok(snapshot.products.length > 600, `solo ${snapshot.products.length} productos`);
  assert.ok(snapshot.families.length > 10);
  for (const p of snapshot.products) {
    assert.ok(p.ref && p.name, "cada producto tiene ref y nombre");
    assert.notEqual(p.active, false, `${p.ref} está desactivado y no debería estar en la foto`);
  }
});

test("ficha por ref: con la API caída sirve la foto", async () => {
  const restore = apiDown();
  try {
    const p = await getProductByRef(sample.ref);
    assert.equal(p?.ref, sample.ref);
    assert.equal(p?.name, sample.name);
  } finally { restore(); }
});

test("ficha por slug: con la API caída sirve la foto", async () => {
  const restore = apiDown();
  try {
    const p = await getProductBySlug(sample.slug!);
    assert.equal(p?.ref, sample.ref);
  } finally { restore(); }
});

test("ref inexistente con la API caída sigue fallando (no inventa productos)", async () => {
  const restore = apiDown();
  try {
    await assert.rejects(() => getProductByRef("NO-EXISTE-123"));
  } finally { restore(); }
});

test("el editor del admin (noSnapshot) NUNCA usa la foto", async () => {
  const restore = apiDown();
  try {
    await assert.rejects(() => getProductByRef(sample.ref, 60, { noSnapshot: true }));
  } finally { restore(); }
});

test("lecturas frescas (revalidate 0) NUNCA usan la foto", async () => {
  const restore = apiDown();
  try {
    await assert.rejects(() => getProductByRef(sample.ref, 0));
    await assert.rejects(() => listFamilies(0));
  } finally { restore(); }
});

test("catálogo completo: con la API caída devuelve la foto entera", async () => {
  const restore = apiDown();
  try {
    const all = await fetchAllProducts();
    assert.equal(all.length, snapshot.products.length);
  } finally { restore(); }
});

test("listado, búsqueda y familias con la API caída", async () => {
  const restore = apiDown();
  try {
    const fams = await listFamilies();
    assert.equal(fams.length, snapshot.families.length);
    const byFamily = await listProducts({ family: sample.family!, limit: 200 });
    assert.ok(byFamily.results.length > 0);
    assert.ok(byFamily.results.every((p) => p.family === sample.family || p.families?.includes(sample.family!)));
    const firstWord = sample.name.split(" ")[0];
    const search = await listProducts({ q: firstWord.toLowerCase(), limit: 200 });
    assert.ok(search.results.some((p) => p.ref === sample.ref), `buscar "${firstWord}" encuentra ${sample.ref}`);
  } finally { restore(); }
});
