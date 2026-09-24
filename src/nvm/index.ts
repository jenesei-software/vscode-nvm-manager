import { detectNvmDir, detectNvmPath } from "./detect";
import type { NvmAdapter } from "./types";
import { NvmUnixAdapter } from "./unixAdapter";
import { NvmWindowsAdapter } from "./windowsAdapter";

export async function createAdapter(
  configuredPath?: string,
  configuredDir?: string,
): Promise<NvmAdapter> {
  if (process.platform === "win32") {
    return new NvmWindowsAdapter(await detectNvmPath(configuredPath));
  }
  if (process.platform === "darwin" || process.platform === "linux") {
    return new NvmUnixAdapter(await detectNvmDir(configuredDir));
  }
  throw new Error(
    `NVM Manager does not support the "${process.platform}" platform yet.`,
  );
}

export { detectNvmDir, detectNvmPath } from "./detect";
export type { InstalledVersion, NvmAdapter, RemoteVersion } from "./types";
