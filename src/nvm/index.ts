import * as os from "node:os";
import * as vscode from "vscode";
import { run } from "../util/exec";
import { dedupePaths, defaultNodeRoots } from "../util/nodeVersions";
import { detectNvmDir, detectNvmPath } from "./detect";
import { NodeAdapter } from "./nodeAdapter";
import type { NvmAdapter } from "./types";
import { NvmUnixAdapter } from "./unixAdapter";
import { NvmWindowsAdapter } from "./windowsAdapter";

async function nodeAvailable(): Promise<boolean> {
  const result = await run("node", ["-v"], 8000, { shell: true });
  return result.code === 0;
}

async function nodeFallback(
  nvmError: unknown,
  extraRoots: string[],
): Promise<NvmAdapter> {
  if (!(await nodeAvailable())) {
    throw nvmError;
  }
  const roots = dedupePaths([
    ...extraRoots,
    ...defaultNodeRoots({
      platform: process.platform,
      env: process.env,
      home: os.homedir(),
    }),
  ]);
  return new NodeAdapter(roots);
}

export async function createAdapter(
  configuredPath?: string,
  configuredDir?: string,
  extraRoots: string[] = [],
): Promise<NvmAdapter> {
  if (process.platform === "win32") {
    try {
      return new NvmWindowsAdapter(await detectNvmPath(configuredPath));
    } catch (error) {
      return nodeFallback(error, extraRoots);
    }
  }
  if (process.platform === "darwin" || process.platform === "linux") {
    try {
      return new NvmUnixAdapter(await detectNvmDir(configuredDir));
    } catch (error) {
      return nodeFallback(
        error,
        dedupePaths([...(configuredDir ? [configuredDir] : []), ...extraRoots]),
      );
    }
  }
  throw new Error(
    vscode.l10n.t(
      'NVM Manager does not support the "{0}" platform yet.',
      process.platform,
    ),
  );
}

export { detectNvmDir, detectNvmPath } from "./detect";
export type {
  AdapterCapabilities,
  AdapterKind,
  InstalledVersion,
  NvmAdapter,
  RemoteVersion,
} from "./types";
