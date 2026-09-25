import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPinContent,
  choosePinFile,
  normalizePinVersion,
} from "../util/pinFile";

test("normalizePinVersion strips a leading v and trims", () => {
  assert.equal(normalizePinVersion("v24.13.1"), "24.13.1");
  assert.equal(normalizePinVersion(" 24.13.1 "), "24.13.1");
  assert.equal(normalizePinVersion("24"), "24");
});

test("buildPinContent ends with a newline", () => {
  assert.equal(buildPinContent("v22.16.0"), "22.16.0\n");
});

test("choosePinFile prefers the existing file", () => {
  assert.equal(choosePinFile({ nvmrc: true, nodeVersion: false }), ".nvmrc");
  assert.equal(
    choosePinFile({ nvmrc: false, nodeVersion: true }),
    ".node-version",
  );
  assert.equal(choosePinFile({ nvmrc: false, nodeVersion: false }), ".nvmrc");
  assert.equal(choosePinFile({ nvmrc: true, nodeVersion: true }), ".nvmrc");
});
