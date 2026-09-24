import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compareVersions,
  parseEnginesNode,
  parseNvmrc,
  parseRequested,
  resolveRequested,
} from "../util/version";

test("parseRequested classifies inputs", () => {
  assert.equal(parseRequested("22.16.0").kind, "exact");
  assert.equal(parseRequested("v22.16.0").kind, "exact");
  assert.equal(parseRequested("22").kind, "major");
  assert.equal(parseRequested("22").major, 22);
  assert.equal(parseRequested("22.16").kind, "prefix");
  assert.equal(parseRequested("22.16").prefix, "22.16");
  assert.equal(parseRequested("lts/*").kind, "lts");
  assert.equal(parseRequested("lts/iron").kind, "lts");
  assert.equal(parseRequested("node").kind, "latest");
  assert.equal(parseRequested("current").kind, "latest");
  assert.equal(parseRequested("garbage").kind, "unknown");
  assert.equal(parseRequested("").kind, "unknown");
});

test("compareVersions orders numerically", () => {
  assert.ok(compareVersions("24.15.0", "22.16.0") > 0);
  assert.ok(compareVersions("22.16.0", "22.9.0") > 0);
  assert.equal(compareVersions("22.16.0", "22.16.0"), 0);
  assert.ok(compareVersions("22.16.1", "22.16.0") > 0);
});

test("resolveRequested matches installed versions", () => {
  const installed = ["22.16.0", "22.18.0", "24.13.0", "24.15.0", "21.7.3"];
  assert.equal(resolveRequested("22.18.0", installed), "22.18.0");
  assert.equal(resolveRequested("v24.13.0", installed), "24.13.0");
  assert.equal(resolveRequested("22", installed), "22.18.0");
  assert.equal(resolveRequested("22.16", installed), "22.16.0");
  assert.equal(resolveRequested("node", installed), "24.15.0");
  assert.equal(resolveRequested("lts/*", installed), "24.15.0");
  assert.equal(resolveRequested("99", installed), undefined);
  assert.equal(resolveRequested("nonsense", installed), undefined);
});

test("resolveRequested without even major falls back to latest", () => {
  const installed = ["21.7.3", "19.9.0"];
  assert.equal(resolveRequested("lts/*", installed), "21.7.3");
});

test("parseNvmrc skips comments and blank lines", () => {
  assert.equal(parseNvmrc("22.16.0"), "22.16.0");
  assert.equal(parseNvmrc("# comment\n 22\n"), "22");
  assert.equal(parseNvmrc("\n\n"), undefined);
});

test("parseEnginesNode extracts a usable version", () => {
  assert.equal(parseEnginesNode(">=20"), "20");
  assert.equal(parseEnginesNode("22.16.0"), "22.16.0");
  assert.equal(parseEnginesNode("^18.12.0"), "18.12.0");
  assert.equal(parseEnginesNode("latest"), undefined);
});
