import { test } from "node:test";
import assert from "node:assert/strict";
import { isPublished } from "@/lib/pim/api";

// La web pública sólo enseña productos publicados Y activos. El soft-delete del
// admin pone active=false pero DEJA status="published"; ese caso NO debe verse.
test("soft-delete (active:false, status:published) → NO publicado", () => {
  assert.equal(isPublished({ active: false, status: "published" }), false);
});

test("activo y publicado → publicado", () => {
  assert.equal(isPublished({ active: true, status: "published" }), true);
});

test("sin status ni active (defaults) → publicado", () => {
  assert.equal(isPublished({}), true);
});

test("status null + active:false → NO publicado", () => {
  assert.equal(isPublished({ active: false, status: null }), false);
});

test("draft / archived → NO publicado", () => {
  assert.equal(isPublished({ active: true, status: "draft" }), false);
  assert.equal(isPublished({ active: true, status: "archived" }), false);
});
