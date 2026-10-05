import assert from "node:assert/strict";
import { test } from "node:test";
import { isPermissionError, NvmPermissionError } from "../nvm/types";
import {
  dedupePaths,
  defaultNodeRoots,
  findNodeBinDir,
  isFullVersion,
  parseVersionHint,
} from "../util/nodeVersions";

test("parseVersionHint extracts a full or major version", () => {
  assert.equal(parseVersionHint("v22.16.0"), "22.16.0");
  assert.equal(parseVersionHint("22.16.0"), "22.16.0");
  assert.equal(parseVersionHint("node-v20.11.0"), "20.11.0");
  assert.equal(parseVersionHint("node@22"), "22");
  assert.equal(parseVersionHint("v22"), "22");
  assert.equal(parseVersionHint("current"), undefined);
  assert.equal(parseVersionHint("nodejs"), undefined);
});

test("isFullVersion only accepts x.y.z", () => {
  assert.equal(isFullVersion("22.16.0"), true);
  assert.equal(isFullVersion("22"), false);
  assert.equal(isFullVersion("22.16"), false);
});

test("findNodeBinDir probes the common layouts", () => {
  const files = (present: string[]) => (candidate: string) =>
    present.includes(candidate);

  assert.equal(
    findNodeBinDir("/nvm/v22.16.0", files(["/nvm/v22.16.0/bin/node"]), "linux"),
    "/nvm/v22.16.0/bin",
  );
  assert.equal(
    findNodeBinDir("/asdf/22.16.0", files(["/asdf/22.16.0/bin/node"]), "linux"),
    "/asdf/22.16.0/bin",
  );
  assert.equal(
    findNodeBinDir(
      "/fnm/22.16.0",
      files(["/fnm/22.16.0/installation/bin/node"]),
      "linux",
    ),
    "/fnm/22.16.0/installation/bin",
  );
  assert.equal(
    findNodeBinDir(
      "C:\\nvm\\v22.16.0",
      files(["C:\\nvm\\v22.16.0\\node.exe"]),
      "win32",
    ),
    "C:\\nvm\\v22.16.0",
  );
  assert.equal(findNodeBinDir("/nvm/v22.16.0", files([]), "linux"), undefined);
});

test("dedupePaths drops duplicates case-insensitively", () => {
  assert.deepEqual(dedupePaths(["C:\\Nvm", "c:\\nvm", undefined, "/opt"]), [
    "C:\\Nvm",
    "/opt",
  ]);
});

test("defaultNodeRoots returns platform-specific candidates", () => {
  const win = defaultNodeRoots({
    platform: "win32",
    env: {
      NVM_HOME: "C:\\nvm",
      APPDATA: "C:\\Users\\me\\AppData\\Roaming",
      LOCALAPPDATA: "C:\\Users\\me\\AppData\\Local",
      ProgramFiles: "C:\\Program Files",
    },
    home: "C:\\Users\\me",
  });
  assert.ok(win.includes("C:\\nvm"));
  assert.ok(win.includes("C:\\Users\\me\\AppData\\Roaming\\nvm"));
  assert.ok(win.includes("C:\\Program Files\\nodejs"));

  const unix = defaultNodeRoots({
    platform: "linux",
    env: { NVM_DIR: "/home/me/.nvm" },
    home: "/home/me",
  });
  assert.ok(unix.includes("/home/me/.nvm"));
  assert.ok(unix.includes("/home/me/.nvm/versions/node"));
  assert.ok(unix.includes("/home/me/.local/share/fnm/node-versions"));
});

test("isPermissionError recognizes privilege failures", () => {
  assert.equal(isPermissionError(new NvmPermissionError("nope")), true);
  assert.equal(isPermissionError(new Error("Access is denied.")), true);
  assert.equal(
    isPermissionError(new Error("You do not have sufficient privileges")),
    true,
  );
  assert.equal(isPermissionError(new Error("network timeout")), false);
  assert.equal(isPermissionError("EPERM: operation not permitted"), true);
});
