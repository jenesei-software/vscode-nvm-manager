import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { run } from "../util/exec";
import {
  dedupePaths,
  findNodeBinDir,
  isFullVersion,
  type NodeInstall,
  parseVersionHint,
} from "../util/nodeVersions";
import { compareVersions } from "../util/version";
import type {
  AdapterCapabilities,
  AdapterKind,
  InstalledVersion,
  NvmAdapter,
  RemoteVersion,
} from "./types";

const MAX_ENTRIES = 200;

/**
 * Fallback used when nvm is not installed. It discovers Node.js installations
 * on disk and switches the active version only inside VS Code terminals, since
 * there is no version manager to repoint anything globally.
 */
export class NodeAdapter implements NvmAdapter {
  readonly kind: AdapterKind = "node";
  readonly capabilities: AdapterCapabilities = {
    install: false,
    uninstall: false,
    remote: false,
  };
  readonly managesTerminalEnv = true;
  readonly dir: string;

  private readonly roots: string[];
  private installs: NodeInstall[] = [];

  constructor(roots: string[]) {
    this.roots = dedupePaths(roots);
    this.dir = this.roots[0] ?? "";
  }

  binDir(version: string): string {
    const known = this.installs.find((item) => item.version === version);
    if (known) {
      return known.binDir;
    }
    for (const root of this.roots) {
      for (const candidate of this.candidateDirs(root)) {
        if (candidate.hint === version) {
          const binDir = findNodeBinDir(
            candidate.dir,
            (value) => fs.existsSync(value),
            process.platform,
          );
          if (binDir) {
            return binDir;
          }
        }
      }
    }
    return "";
  }

  async listInstalled(): Promise<InstalledVersion[]> {
    this.installs = await this.scan();
    return this.installs.map((item) => ({
      version: item.version,
      active: false,
    }));
  }

  async current(): Promise<string | undefined> {
    const result = await run("node", ["-v"], 8000, { shell: true });
    if (result.code !== 0) {
      return undefined;
    }
    return result.stdout.match(/v?(\d+\.\d+\.\d+)/)?.[1];
  }

  async version(): Promise<string | undefined> {
    return undefined;
  }

  async use(_version: string): Promise<void> {
    // Switching is applied through the integrated terminal environment.
  }

  async install(_version: string): Promise<void> {
    throw new Error(
      vscode.l10n.t("Installing Node.js requires nvm, which was not found."),
    );
  }

  async uninstall(_version: string): Promise<void> {
    throw new Error(
      vscode.l10n.t("Uninstalling Node.js requires nvm, which was not found."),
    );
  }

  async listRemote(): Promise<RemoteVersion[]> {
    throw new Error(
      vscode.l10n.t(
        "Listing available versions requires nvm, which was not found.",
      ),
    );
  }

  async root(): Promise<string> {
    return this.dir;
  }

  private async scan(): Promise<NodeInstall[]> {
    const found: NodeInstall[] = [];
    const seen = new Set<string>();
    for (const root of this.roots) {
      for (const candidate of this.candidateDirs(root)) {
        const binDir = findNodeBinDir(
          candidate.dir,
          (value) => fs.existsSync(value),
          process.platform,
        );
        if (!binDir) {
          continue;
        }
        const version = await this.versionFor(candidate.hint, binDir);
        if (!version || seen.has(version)) {
          continue;
        }
        seen.add(version);
        found.push({ version, binDir, root });
      }
    }
    return found.sort((a, b) => compareVersions(b.version, a.version));
  }

  private candidateDirs(root: string): Array<{ dir: string; hint?: string }> {
    const candidates: Array<{ dir: string; hint?: string }> = [{ dir: root }];
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(root, { withFileTypes: true });
    } catch {
      return candidates;
    }
    for (const entry of entries.slice(0, MAX_ENTRIES)) {
      if (!entry.isDirectory()) {
        continue;
      }
      const hint = parseVersionHint(entry.name);
      if (!hint) {
        continue;
      }
      candidates.push({ dir: path.join(root, entry.name), hint });
    }
    return candidates;
  }

  private async versionFor(
    hint: string | undefined,
    binDir: string,
  ): Promise<string | undefined> {
    if (hint && isFullVersion(hint)) {
      return hint;
    }
    const binary = path.join(
      binDir,
      process.platform === "win32" ? "node.exe" : "node",
    );
    const result = await run(binary, ["-v"], 8000);
    if (result.code !== 0) {
      return undefined;
    }
    return result.stdout.match(/v?(\d+\.\d+\.\d+)/)?.[1];
  }
}
