export interface InstalledVersion {
  version: string;
  active: boolean;
}

export interface RemoteVersion {
  version: string;
  lts: string | false;
}

export interface NvmAdapter {
  /**
   * Whether switching a version is expressed through the integrated terminal
   * environment instead of a global system change (true on Unix, false on
   * nvm-windows).
   */
  readonly managesTerminalEnv: boolean;
  /** nvm root directory, used to build terminal PATH entries on Unix. */
  readonly dir: string;

  listInstalled(): Promise<InstalledVersion[]>;
  current(): Promise<string | undefined>;
  use(version: string): Promise<void>;
  install(version: string): Promise<void>;
  uninstall(version: string): Promise<void>;
  listRemote(): Promise<RemoteVersion[]>;
  root(): Promise<string>;
}
