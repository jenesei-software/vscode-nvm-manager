import { run } from "../util/exec";
import { parseUnixInstalled, parseUnixRemote } from "../util/parse";
import type { InstalledVersion, NvmAdapter, RemoteVersion } from "./types";

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/**
 * Adapter for nvm-sh (macOS / Linux). nvm is a shell function, so every call
 * runs inside a short bash process that sources nvm.sh first. Switching a
 * version cannot change the process that hosts the extension: the selection is
 * applied to the integrated terminal environment by the service layer.
 */
export class NvmUnixAdapter implements NvmAdapter {
  readonly managesTerminalEnv = true;
  readonly dir: string;

  constructor(nvmDir: string) {
    this.dir = nvmDir;
  }

  private execNvm(args: string, timeout = 60000) {
    const script = [
      `export NVM_DIR=${shellQuote(this.dir)}`,
      '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"',
      `nvm ${args}`,
    ].join("; ");
    return run("bash", ["-c", script], timeout);
  }

  async listInstalled(): Promise<InstalledVersion[]> {
    const { stdout, stderr, code } = await this.execNvm("ls", 30000);
    if (code !== 0) {
      throw new Error((stderr || stdout).trim() || "nvm ls failed");
    }
    return parseUnixInstalled(stdout);
  }

  async current(): Promise<string | undefined> {
    const { stdout, code } = await this.execNvm("current", 15000);
    if (code !== 0) {
      return undefined;
    }
    return stdout.match(/v?(\d+\.\d+\.\d+)/)?.[1];
  }

  async version(): Promise<string | undefined> {
    const { stdout, code } = await this.execNvm("--version", 15000);
    if (code !== 0) {
      return undefined;
    }
    const match = stdout.match(/(\d+\.\d+\.\d+)/)?.[1];
    if (match) {
      return match;
    }
    return stdout.trim() || undefined;
  }

  async use(_version: string): Promise<void> {
    // Switching is applied through the integrated terminal environment.
  }

  async install(version: string): Promise<void> {
    const { stdout, stderr, code } = await this.execNvm(
      `install ${shellQuote(version)}`,
      300000,
    );
    if (code !== 0) {
      throw new Error(
        (stderr || stdout).trim() || `nvm install ${version} failed`,
      );
    }
  }

  async uninstall(version: string): Promise<void> {
    const { stdout, stderr, code } = await this.execNvm(
      `uninstall ${shellQuote(version)}`,
      120000,
    );
    if (code !== 0) {
      throw new Error(
        (stderr || stdout).trim() || `nvm uninstall ${version} failed`,
      );
    }
  }

  async listRemote(): Promise<RemoteVersion[]> {
    const { stdout, stderr, code } = await this.execNvm("ls-remote", 120000);
    if (code !== 0) {
      throw new Error((stderr || stdout).trim() || "nvm ls-remote failed");
    }
    return parseUnixRemote(stdout);
  }

  async root(): Promise<string> {
    return this.dir;
  }
}
