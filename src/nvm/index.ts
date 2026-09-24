import { detectNvmPath } from "./detect";
import type { NvmAdapter } from "./types";
import { NvmWindowsAdapter } from "./windowsAdapter";

export async function createAdapter(
  configuredPath?: string,
): Promise<NvmAdapter> {
  const nvmPath = await detectNvmPath(configuredPath);
  return new NvmWindowsAdapter(nvmPath);
}

export { detectNvmPath } from "./detect";
export type { InstalledVersion, NvmAdapter, RemoteVersion } from "./types";
