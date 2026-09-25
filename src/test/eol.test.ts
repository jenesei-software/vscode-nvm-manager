import assert from "node:assert/strict";
import { test } from "node:test";
import { eolDate, isEol } from "../util/eol";

test("eolDate maps known majors", () => {
  assert.equal(eolDate("18.20.4"), "2025-04");
  assert.equal(eolDate("22.16.0"), "2027-04");
  assert.equal(eolDate("99.0.0"), undefined);
});

test("isEol is relative to the given date", () => {
  const now = new Date("2026-09-25");
  assert.equal(isEol("16.20.2", now), true);
  assert.equal(isEol("18.20.4", now), true);
  assert.equal(isEol("20.11.0", now), true);
  assert.equal(isEol("22.16.0", now), false);
  assert.equal(isEol("24.13.1", now), false);
  assert.equal(isEol("99.0.0", now), false);
});

test("isEol keeps a version alive during its EOL month", () => {
  assert.equal(isEol("20.11.0", new Date("2026-04-30")), false);
  assert.equal(isEol("20.11.0", new Date("2026-05-01")), true);
});
