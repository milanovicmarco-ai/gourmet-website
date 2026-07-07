import { test } from "node:test";
import assert from "node:assert/strict";
import { curatedLimit } from "@/lib/pim/featured";

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
