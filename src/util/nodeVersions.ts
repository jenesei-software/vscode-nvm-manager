import * as path from "node:path";

export interface NodeInstall {
  version: string;
  binDir: string;
  root: string;
}

const FULL_VERSION = /v?(\d+\.\d+\.\d+)/;
const VERSION_HINT = /^(?:node[-@]?)?v?(\d+(?:\.\d+)*)$/i;

/**
 * Best-effort version hint from a directory name. Returns a full `x.y.z` when
 * present, or a bare major (e.g. `node@22` -> `22`) which the caller may expand
 * by running the binary.
 */
export function parseVersionHint(name: string): string | undefined {
  const trimmed = name.trim();
  const full = FULL_VERSION.exec(trimmed);
  if (full) {
    return full[1];
  }
  return VERSION_HINT.exec(trimmed)?.[1];
}

export function isFullVersion(value: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(value);
}

/**
 * Locate the directory that contains the `node` / `node.exe` binary inside a
 * version directory. Handles the common layouts: nvm / nvm-windows (`<dir>`),
 * asdf / volta / fnm (`<dir>/bin`, `<dir>/installation/bin`).
 */
export function findNodeBinDir(
  dir: string,
  exists: (candidate: string) => boolean,
  platform: NodeJS.Platform,
): string | undefined {
  const binary = platform === "win32" ? "node.exe" : "node";
  const join = platform === "win32" ? path.win32.join : path.posix.join;
  const candidates = [dir, join(dir, "bin"), join(dir, "installation", "bin")];
  for (const candidate of candidates) {
    if (exists(join(candidate, binary))) {
      return candidate;
    }
  }
  return undefined;
}

export function dedupePaths(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) {
      continue;
    }
    const key = value.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }
  return result;
}

/**
 * Well-known roots that may hold Node.js installations, used by the bare-Node
 * fallback when nvm is unavailable.
 */
export function defaultNodeRoots(input: {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  home: string;
}): string[] {
  const roots: Array<string | undefined> = [];
  if (input.platform === "win32") {
    const join = path.win32.join;
    roots.push(
      input.env.NVM_HOME,
      input.env.APPDATA && join(input.env.APPDATA, "nvm"),
      input.env.LOCALAPPDATA && join(input.env.LOCALAPPDATA, "nvm"),
      input.env.ProgramFiles && join(input.env.ProgramFiles, "nodejs"),
      input.env.LOCALAPPDATA &&
        join(input.env.LOCALAPPDATA, "Programs", "nodejs"),
    );
  } else {
    const join = path.posix.join;
    roots.push(
      input.env.NVM_DIR,
      join(input.home, ".nvm", "versions", "node"),
      join(input.home, ".local", "share", "fnm", "node-versions"),
      join(input.home, ".volta", "tools", "image", "node"),
      join(input.home, ".asdf", "installs", "nodejs"),
      "/opt/homebrew/opt",
      "/usr/local/opt",
    );
  }
  return dedupePaths(roots);
}
