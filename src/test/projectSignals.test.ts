import assert from "node:assert/strict";
import { test } from "node:test";
import { collectNodeDeclarations } from "../util/projectSignals";

test("collectNodeDeclarations returns sources in priority order", () => {
  const declarations = collectNodeDeclarations({
    nvmrc: "22.16.0\n",
    nodeVersion: "20\n",
    packageJson: { engines: { node: ">=18 <21" } },
  });

  assert.deepEqual(
    declarations.map((item) => item.source),
    ["nvmrc", "node-version", "engines"],
  );
  assert.equal(declarations[0].raw, "22.16.0");
  assert.equal(declarations[0].file, ".nvmrc");
  assert.equal(declarations[2].raw, ">=18 <21");
  assert.equal(declarations[2].file, "package.json");
});

test("collectNodeDeclarations skips missing and comment-only files", () => {
  assert.deepEqual(
    collectNodeDeclarations({ nvmrc: "# just a comment\n\n" }),
    [],
  );
  assert.deepEqual(collectNodeDeclarations({}), []);
});

test("collectNodeDeclarations falls back to engines only", () => {
  const declarations = collectNodeDeclarations({
    packageJson: { engines: { node: "20" } },
  });
  assert.equal(declarations.length, 1);
  assert.equal(declarations[0].source, "engines");
  assert.equal(declarations[0].raw, "20");
});
