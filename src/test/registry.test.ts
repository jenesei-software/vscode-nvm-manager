import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_REGISTRY,
  detectRegistry,
  parseBunfig,
  parseNpmrc,
  parseYarnrc,
  parseYarnrcYml,
} from "../util/registry";

test("parseNpmrc reads the default registry and scopes, skipping comments", () => {
  const parsed = parseNpmrc(
    [
      "# a comment",
      "; another comment",
      "registry=https://corp.example.com/",
      "@acme:registry = https://npm.acme.example/",
      "//npm.acme.example/:_authToken=secret",
    ].join("\n"),
  );
  assert.equal(parsed.registry, "https://corp.example.com/");
  assert.deepEqual(parsed.scoped, [
    { scope: "@acme", url: "https://npm.acme.example/" },
  ]);
});

test("parseYarnrc handles both quoted and equals forms", () => {
  assert.equal(
    parseYarnrc('registry "https://yarn.example.com"'),
    "https://yarn.example.com",
  );
  assert.equal(
    parseYarnrc("registry=https://yarn.example.com"),
    "https://yarn.example.com",
  );
});

test("parseYarnrcYml reads npmRegistryServer", () => {
  assert.equal(
    parseYarnrcYml("npmRegistryServer: 'https://yarn.example.com'\n"),
    "https://yarn.example.com",
  );
});

test("parseBunfig only reads registry inside the [install] section", () => {
  const text = [
    'registry = "https://ignored.example.com"',
    "[install]",
    'registry = "https://bun.example.com/"',
  ].join("\n");
  assert.equal(parseBunfig(text), "https://bun.example.com/");
});

test("detectRegistry prefers the project file and falls back to the default", () => {
  const withProject = detectRegistry({
    project: { npmrc: "registry=https://corp.example.com/" },
    global: {},
  });
  assert.deepEqual(withProject.project, {
    url: "https://corp.example.com/",
    source: ".npmrc",
  });
  assert.equal(withProject.effective.url, "https://corp.example.com/");
  assert.equal(withProject.differs, false);

  const empty = detectRegistry({ project: {}, global: {} });
  assert.equal(empty.project, undefined);
  assert.equal(empty.effective.url, DEFAULT_REGISTRY);
  assert.equal(empty.effective.source, "default");
});

test("detectRegistry reads the global registry from ~/.npmrc", () => {
  const info = detectRegistry({
    project: {},
    global: { npmrc: "registry=https://global.example.com/" },
  });
  assert.deepEqual(info.global, {
    url: "https://global.example.com/",
    source: "~/.npmrc",
  });
  assert.equal(info.effective.url, "https://global.example.com/");
});

test("detectRegistry lets the advanced command override ~/.npmrc", () => {
  const info = detectRegistry({
    project: {},
    global: {
      npmrc: "registry=https://ignored.example.com/",
      command: "https://command.example.com/\n",
    },
  });
  assert.deepEqual(info.global, {
    url: "https://command.example.com/",
    source: "npm config",
  });
});

test("detectRegistry reports whether project and global differ", () => {
  const same = detectRegistry({
    project: { npmrc: "registry=https://corp.example.com/" },
    global: { npmrc: "registry=https://corp.example.com" },
  });
  assert.equal(same.differs, false);

  const different = detectRegistry({
    project: { npmrc: "registry=https://corp.example.com/" },
    global: { npmrc: "registry=https://registry.npmjs.org/" },
  });
  assert.equal(different.differs, true);
});

test("detectRegistry picks the file that matches the package manager", () => {
  const files = {
    npmrc: "registry=https://npm.example.com/",
    yarnrcYml: "npmRegistryServer: https://yarn.example.com/",
  };
  assert.equal(
    detectRegistry({ manager: "yarn", project: files, global: {} }).project
      ?.url,
    "https://yarn.example.com/",
  );
  assert.equal(
    detectRegistry({ manager: "npm", project: files, global: {} }).project?.url,
    "https://npm.example.com/",
  );
});

test("detectRegistry merges scoped registries with project priority", () => {
  const info = detectRegistry({
    project: { npmrc: "@acme:registry=https://project.acme.example/" },
    global: { npmrc: "@acme:registry=https://global.acme.example/" },
  });
  assert.deepEqual(info.scoped, [
    {
      scope: "@acme",
      url: "https://project.acme.example/",
      source: ".npmrc",
    },
  ]);
});
