import assert from "node:assert/strict";
import { test } from "node:test";
import { bestMatch, satisfies } from "../util/semver";

test("satisfies handles comparators and ranges", () => {
  assert.equal(satisfies("20.5.0", ">=20 <21"), true);
  assert.equal(satisfies("22.16.0", ">=20 <21"), false);
  assert.equal(satisfies("18.11.0", "^18.12.0"), false);
  assert.equal(satisfies("18.12.0", "^18.12.0"), true);
  assert.equal(satisfies("18.20.1", "^18.12.0"), true);
  assert.equal(satisfies("19.0.0", "^18.12.0"), false);
  assert.equal(satisfies("18.12.5", "~18.12.0"), true);
  assert.equal(satisfies("18.13.0", "~18.12.0"), false);
  assert.equal(satisfies("0.2.9", "^0.2.3"), true);
  assert.equal(satisfies("0.3.0", "^0.2.3"), false);
  assert.equal(satisfies("20.11.0", "20.x"), true);
  assert.equal(satisfies("21.0.0", "20.x"), false);
  assert.equal(satisfies("20.0.0", "*"), true);
  assert.equal(satisfies("16.5.0", ">=18 || <=16"), true);
  assert.equal(satisfies("17.0.0", ">=18 || <=16"), false);
  assert.equal(satisfies("20.0.0", ">=18 || <=16"), true);
});

test("bestMatch picks the highest installed match", () => {
  const installed = ["18.0.0", "20.5.0", "20.11.0", "21.0.0"];
  assert.equal(bestMatch(">=20 <21", installed), "20.11.0");
  assert.equal(bestMatch("20", installed), "20.11.0");
  assert.equal(bestMatch("^18.12.0", installed), undefined);
  assert.equal(bestMatch(">=18", installed), "21.0.0");
});
