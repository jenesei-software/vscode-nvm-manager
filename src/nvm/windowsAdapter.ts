import * as path from "node:path";
import { run } from "../util/exec";
import { compareVersions } from "../util/version";
import type { InstalledVersion, NvmAdapter, RemoteVersion } from "./types";

const VERSION = /^\d+\.\d+\.\d+$/;
const VERSION_AT_START = /^(\d+\.\d+\.\d+)/;

const REMOTE_LABELS: Record<number, string | false> = {
  0: "Current",
  1: "LTS",
  2: "Old Stable",
  3: "Old Unstable",
};

export class NvmWindowsAdapter implements NvmAdapter {
  readonly managesTerminalEnv = false;
  readonly dir: string;

  constructor(private readonly nvmPath: string) {
    this.dir = path.dirname(nvmPath);
  }

  private exec(args: string[], timeout = 60000) {
    return run(this.nvmPath, args, timeout);
  }

  async listInstalled(): Promise<InstalledVersion[]> {
    const { stdout, stderr, code } = await this.exec(["list"], 30000);
    if (code !== 0) {
      throw new Error((stderr || stdout).trim() || "nvm list failed");
    }
    const versions: InstalledVersion[] = [];
    const seen = new Set<string>();
    for (const line of stdout.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      const active = trimmed.startsWith("*");
      const body = active ? trimmed.slice(1).trim() : trimmed;
      const version = body.match(VERSION_AT_START)?.[1];
      if (!version || seen.has(version)) {
        continue;
      }
      seen.add(version);
      versions.push({ version, active });
    }
    return versions.sort((a, b) => compareVersions(b.version, a.version));
  }

  async current(): Promise<string | undefined> {
    const { stdout, code } = await this.exec(["current"], 15000);
    if (code !== 0) {
      return undefined;
    }
    const version = stdout.match(/(\d+\.\d+\.\d+)/)?.[1];
    return version;
  }

  async version(): Promise<string | undefined> {
    const { stdout, code } = await this.exec(["version"], 15000);
    if (code !== 0) {
      return undefined;
    }
    const match = stdout.match(/(\d+\.\d+\.\d+)/)?.[1];
    if (match) {
      return match;
    }
    return stdout.trim() || undefined;
  }

  async use(version: string): Promise<void> {
    const { stdout, stderr, code } = await this.exec(["use", version], 120000);
    if (code !== 0) {
      throw new Error((stderr || stdout).trim() || `nvm use ${version} failed`);
    }
  }

  async install(version: string): Promise<void> {
    const { stdout, stderr, code } = await this.exec(
      ["install", version],
      300000,
    );
    if (code !== 0) {
      throw new Error(
        (stderr || stdout).trim() || `nvm install ${version} failed`,
      );
    }
  }

  async uninstall(version: string): Promise<void> {
    const { stdout, stderr, code } = await this.exec(
      ["uninstall", version],
      120000,
    );
    if (code !== 0) {
      throw new Error(
        (stderr || stdout).trim() || `nvm uninstall ${version} failed`,
      );
    }
  }

  async listRemote(): Promise<RemoteVersion[]> {
    const { stdout, stderr, code } = await this.exec(
      ["list", "available"],
      60000,
    );
    if (code !== 0) {
      throw new Error((stderr || stdout).trim() || "nvm list available failed");
    }
    const versions: RemoteVersion[] = [];
    const seen = new Set<string>();
    for (const line of stdout.split(/\r?\n/)) {
      if (!line.includes("|")) {
        continue;
      }
      const cells = line
        .split("|")
        .map((cell) => cell.trim())
        .filter((_cell, index, all) => index > 0 && index < all.length - 1);
      cells.forEach((cell, index) => {
        if (!VERSION.test(cell) || seen.has(cell)) {
          return;
        }
        seen.add(cell);
        versions.push({ version: cell, lts: REMOTE_LABELS[index] ?? false });
      });
    }
    return versions.sort((a, b) => compareVersions(b.version, a.version));
  }

  async root(): Promise<string> {
    const { stdout } = await this.exec(["root"], 15000);
    const match = stdout.match(/Current Root:\s*(.+)/i);
    if (match) {
      return match[1].trim();
    }
    return process.env.NVM_HOME ?? "";
  }
}
