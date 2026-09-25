import * as path from "node:path";
import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "out/test/integration/**/*.test.js",
  version: "stable",
  workspaceFolder: "src/test/fixtures/workspace",
  env: {
    NVM_DIR: path.resolve("src/test/fixtures/nvm"),
  },
  mocha: {
    ui: "tdd",
    timeout: 30000,
  },
});
