import assert from "node:assert/strict";
import { test } from "node:test";
import { parseUnixInstalled, parseUnixRemote } from "../util/parse";

test("parseUnixInstalled reads versions and the active marker", () => {
  const output = [
    "       v24.15.0",
    "       v22.23.0",
    "->     v22.16.0",
    "       v20.11.0",
    "default -> 22 (-> v22.16.0)",
    "node -> stable (-> v22.16.0) (default)",
    "stable -> 22.16 (-> v22.16.0) (default)",
    "lts/* -> lts/iron (-> v20.11.0)",
    "iojs -> N/A (default)",
    "system -> /usr/bin/node",
  ].join("\n");

  const parsed = parseUnixInstalled(output);

  assert.deepEqual(
    parsed.map((item) => item.version),
    ["24.15.0", "22.23.0", "22.16.0", "20.11.0"],
  );
  assert.equal(parsed.find((item) => item.active)?.version, "22.16.0");
  assert.equal(parsed.filter((item) => item.active).length, 1);
});

test("parseUnixInstalled handles no installations", () => {
  assert.deepEqual(parseUnixInstalled("N/A: version not found\n"), []);
});

test("parseUnixRemote reads versions and LTS labels", () => {
  const output = [
    "v0.1.14",
    "v20.11.0   (LTS: Iron)",
    "v20.11.1   (Latest LTS: Iron)",
    "v22.16.0",
  ].join("\n");

  const parsed = parseUnixRemote(output);

  assert.deepEqual(
    parsed.map((item) => item.version),
    ["22.16.0", "20.11.1", "20.11.0", "0.1.14"],
  );
  assert.equal(
    parsed.find((item) => item.version === "20.11.1")?.lts,
    "LTS: Iron",
  );
  assert.equal(
    parsed.find((item) => item.version === "20.11.0")?.lts,
    "LTS: Iron",
  );
  assert.equal(parsed.find((item) => item.version === "22.16.0")?.lts, false);
});
