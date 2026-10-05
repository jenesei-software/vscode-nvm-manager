export interface InstalledVersion {
  version: string;
  active: boolean;
}

export interface RemoteVersion {
  version: string;
  lts: string | false;
}

export type AdapterKind = "nvm" | "node";

export interface AdapterCapabilities {
  install: boolean;
  uninstall: boolean;
  remote: boolean;
}

/**
 * Raised when `nvm use` fails because the current user lacks the privileges to
 * repoint the global symlink (nvm-windows without admin / Developer Mode).
 */
export class NvmPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NvmPermissionError";
  }
}

const PERMISSION_PATTERN =
  /denied|privileges|administrator|admin|EPERM|symbolic link|symlink/i;

export function isPermissionError(error: unknown): boolean {
  if (error instanceof NvmPermissionError) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return PERMISSION_PATTERN.test(message);
}

export interface NvmAdapter {
  /** Backend in use: a real nvm install or a bare Node.js fallback. */
  readonly kind: AdapterKind;
  /** Which lifecycle operations the backend supports. */
  readonly capabilities: AdapterCapabilities;
  /**
   * Whether switching a version is expressed through the integrated terminal
   * environment instead of a global system change (true on Unix and in the
   * bare Node.js fallback, false on nvm-windows).
   */
  readonly managesTerminalEnv: boolean;
  /** nvm root directory, used to build terminal PATH entries. */
  readonly dir: string;

  /** Directory containing `node` / `node.exe` for the given version. */
  binDir(version: string): string;

  listInstalled(): Promise<InstalledVersion[]>;
  current(): Promise<string | undefined>;
  version(): Promise<string | undefined>;
  use(version: string): Promise<void>;
  install(version: string): Promise<void>;
  uninstall(version: string): Promise<void>;
  listRemote(): Promise<RemoteVersion[]>;
  root(): Promise<string>;
}
