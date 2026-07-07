import { test } from "node:test";
import assert from "node:assert/strict";
import { curatedLimit, isCuratedRenderIncomplete, fetchRefsResilient } from "@/lib/pim/featured";
import type { ApiProduct } from "@/lib/pim/api";

// Cheese Lovers (fromages) muestra TODOS los destacados; el resto de hubs, 4.
test("curatedLimit: fromages sin límite explícito → ilimitado", () => {
  assert.equal(curatedLimit("fromages"), Infinity);
});

test("curatedLimit: otros catálogos → tope de vitrina (4)", () => {
  assert.equal(curatedLimit("retail"), 4);
  assert.equal(curatedLimit("horeca"), 4);
});

test("curatedLimit: un límite explícito siempre manda", () => {
  assert.equal(curatedLimit("fromages", 4), 4);
  assert.equal(curatedLimit("retail", 10), 10);
});

// Freeze-guard: una lista curada COMPLETA (limit=Infinity, p.ej. fromages) que
// perdió refs por fallo de carga está PROBADAMENTE incompleta → no debe cachearse.
// Una vitrina capada (limit finito) nunca es "incompleta": nunca prometió todo.
test("isCuratedRenderIncomplete: completa (Infinity) con fallos → incompleta", () => {
  assert.equal(isCuratedRenderIncomplete(Infinity, 1), true);
  assert.equal(isCuratedRenderIncomplete(Infinity, 5), true);
});

test("isCuratedRenderIncomplete: completa (Infinity) sin fallos → completa", () => {
  assert.equal(isCuratedRenderIncomplete(Infinity, 0), false);
});

test("isCuratedRenderIncomplete: vitrina capada (finito) con fallos → NO incompleta", () => {
  assert.equal(isCuratedRenderIncomplete(4, 3), false);
  assert.equal(isCuratedRenderIncomplete(4, 0), false);
});

// El fan-out clasifica cada ref: producto OK → se queda; null (404, ausencia
// legítima) → se omite SIN contar como fallo; throw (timeout/5xx tras agotar) →
// cuenta como fallo de carga (señal de render incompleto).
test("fetchRefsResilient: clasifica ok / 404-null / fallo-throw", async () => {
  const fetchOne = async (ref: string): Promise<ApiProduct | null> => {
    if (ref === "OK") return { ref: "OK", name: "Queso" } as ApiProduct;
    if (ref === "GONE") return null; // 404
    throw new Error("timeout"); // fallo de carga
  };
  const { products, failedRefCount } = await fetchRefsResilient(["OK", "GONE", "FAIL"], fetchOne, 2);
  assert.equal(products.length, 1);
  assert.equal(products[0]?.ref, "OK");
  assert.equal(failedRefCount, 1, "solo el throw cuenta; el 404 no");
});

test("fetchRefsResilient: sin fallos → failedRefCount 0 y todos los productos", async () => {
  const fetchOne = async (ref: string): Promise<ApiProduct | null> => ({ ref, name: "Q" }) as ApiProduct;
  const { products, failedRefCount } = await fetchRefsResilient(["A", "B", "C"], fetchOne, 2);
  assert.equal(products.length, 3);
  assert.equal(failedRefCount, 0);
});
