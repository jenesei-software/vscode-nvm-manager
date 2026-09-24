import * as fs from "node:fs";
import * as path from "node:path";
import { run } from "../util/exec";

export function normalizeNvmPath(value: string): string {
  return value.replace(/^"|"$/g, "").trim();
}

export async function detectNvmPath(configured?: string): Promise<string> {
  if (process.platform !== "win32") {
    throw new Error(
      "NVM Manager currently supports Windows (nvm-windows) only.",
    );
  }

  const candidates: string[] = [];
  const configuredPath = configured ? normalizeNvmPath(configured) : "";
  if (configuredPath) {
    candidates.push(configuredPath);
  }
  const nvmHome = process.env.NVM_HOME;
  if (nvmHome) {
    candidates.push(path.join(nvmHome, "nvm.exe"));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const result = await run("where", ["nvm"], 10000);
  if (result.code === 0) {
    const found = result.stdout
      .split(/\r?\n/)
      .map((line) => normalizeNvmPath(line))
      .find((line) => line && fs.existsSync(line));
    if (found) {
      return found;
    }
  }

  throw new Error(
    'nvm.exe not found. Install nvm-windows or set "nvmManager.nvmPath".',
  );
}
