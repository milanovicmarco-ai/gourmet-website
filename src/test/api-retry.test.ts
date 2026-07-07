import { test } from "node:test";
import assert from "node:assert/strict";
import { getProductByRef } from "@/lib/pim/api";

const abortError = () => Object.assign(new Error("The operation was aborted"), { name: "AbortError" });
const okProduct = (ref: string) => new Response(JSON.stringify({ ref, name: "Queso" }), { status: 200 });

function stubFetch(impl: () => Promise<Response>) {
  const orig = globalThis.fetch;
  globalThis.fetch = impl as typeof fetch;
  return () => { globalThis.fetch = orig; };
}

// El path de LISTADOS (fromages) necesita reintentar timeouts intermitentes para
// no perder quesos. retryTimeout:true reactiva el reintento en AbortError.
test("getProductByRef con retryTimeout reintenta un timeout y recupera el producto", async () => {
  let calls = 0;
  const restore = stubFetch(async () => {
    calls++;
    if (calls === 1) throw abortError();
    return okProduct("Q1");
  });
  try {
    const p = await getProductByRef("Q1", 3600, { retryTimeout: true });
    assert.equal(calls, 2, "debe haber reintentado exactamente una vez");
    assert.equal(p?.ref, "Q1");
  } finally { restore(); }
});

// La FICHA individual conserva el fast-fail de #15: un timeout NO se reintenta
// (reintentar amplifica la ráfaga contra un backend saturado).
test("getProductByRef sin opts NO reintenta un timeout (mantiene #15)", async () => {
  let calls = 0;
  const restore = stubFetch(async () => { calls++; throw abortError(); });
  try {
    await assert.rejects(() => getProductByRef("Q1"), /aborted/i);
    assert.equal(calls, 1, "un solo intento, sin reintento en timeout");
  } finally { restore(); }
});

// Un 404 es ausencia legítima (producto borrado), no un fallo de carga: devuelve
// null sin reintentar, incluso con retryTimeout.
test("getProductByRef trata 404 como ausencia (null), sin reintento", async () => {
  let calls = 0;
  const restore = stubFetch(async () => { calls++; return new Response("", { status: 404 }); });
  try {
    const p = await getProductByRef("GONE", 3600, { retryTimeout: true });
    assert.equal(p, null);
    assert.equal(calls, 1);
  } finally { restore(); }
});
