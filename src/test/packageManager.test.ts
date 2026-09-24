import assert from "node:assert/strict";
import { test } from "node:test";
import { detectPackageManager } from "../util/packageManager";

function files(...present: string[]): (relativePath: string) => boolean {
  const set = new Set(present);
  return (relativePath) => set.has(relativePath);
}

test("detects the package manager from a lockfile and install marker", () => {
  const result = detectPackageManager({
    hasFile: files("pnpm-lock.yaml", "node_modules/.pnpm"),
  });
  assert.equal(result.detected, "pnpm");
  assert.equal(result.detectedFrom, "pnpm-lock.yaml");
  assert.equal(result.used, "pnpm");
  assert.equal(result.declared, undefined);
  assert.deepEqual(result.conflicts, []);
});

test("reads the declared packageManager field", () => {
  const result = detectPackageManager({
    hasFile: files(),
    packageJson: { packageManager: "pnpm@9.15.0+sha512.abc" },
  });
  assert.deepEqual(result.declared, {
    name: "pnpm",
    version: "9.15.0",
    source: "packageManager",
  });
});

test("reads devEngines packageManager", () => {
  const result = detectPackageManager({
    hasFile: files(),
    packageJson: {
      devEngines: { packageManager: { name: "yarn", version: "4.0.0" } },
    },
  });
  assert.deepEqual(result.declared, {
    name: "yarn",
    version: "4.0.0",
    source: "devEngines",
  });
});

test("reports a conflict between declared and detected", () => {
  const result = detectPackageManager({
    hasFile: files("package-lock.json"),
    packageJson: { packageManager: "pnpm@9.15.0" },
  });
  assert.equal(result.detected, "npm");
  assert.equal(result.conflicts.length, 1);
  assert.match(result.conflicts[0], /pnpm/);
});

test("reports multiple lockfiles", () => {
  const result = detectPackageManager({
    hasFile: files("package-lock.json", "yarn.lock"),
  });
  assert.equal(result.conflicts.length, 1);
  assert.match(result.conflicts[0], /multiple lockfiles/);
});

test("infers bun usage from a bun lockfile", () => {
  const result = detectPackageManager({
    hasFile: files("bun.lockb", "node_modules"),
  });
  assert.equal(result.detected, "bun");
  assert.equal(result.used, "bun");
});
