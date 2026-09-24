export interface InstalledVersion {
  version: string;
  active: boolean;
}

export interface RemoteVersion {
  version: string;
  lts: string | false;
}

export interface NvmAdapter {
  listInstalled(): Promise<InstalledVersion[]>;
  current(): Promise<string | undefined>;
  use(version: string): Promise<void>;
  install(version: string): Promise<void>;
  uninstall(version: string): Promise<void>;
  listRemote(): Promise<RemoteVersion[]>;
  root(): Promise<string>;
}
