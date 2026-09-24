import * as vscode from "vscode";
import type { InstalledVersion, NvmAdapter, RemoteVersion } from "../nvm/types";
import { resolveRequested } from "../util/version";
import type { TerminalEnv } from "./terminalEnv";

export class VersionService {
  private installed: InstalledVersion[] = [];
  private remote?: RemoteVersion[];
  private currentVersion?: string;
  private loadingRemote = false;

  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.changeEmitter.event;

  constructor(
    private readonly adapter: NvmAdapter,
    private readonly terminalEnv?: TerminalEnv,
  ) {}

  getInstalled(): InstalledVersion[] {
    return this.installed;
  }

  getRemote(): RemoteVersion[] | undefined {
    return this.remote;
  }

  getCurrent(): string | undefined {
    return this.currentVersion;
  }

  isLoadingRemote(): boolean {
    return this.loadingRemote;
  }

  resolve(requested: string): string | undefined {
    return resolveRequested(
      requested,
      this.installed.map((item) => item.version),
    );
  }

  async refresh(): Promise<void> {
    const installed = await this.adapter.listInstalled();
    const current = this.adapter.managesTerminalEnv
      ? (this.terminalEnv?.getSelected() ?? (await this.adapter.current()))
      : await this.adapter.current();
    this.currentVersion = current;
    this.installed = installed.map((item) => ({
      version: item.version,
      active: item.version === current,
    }));
    this.changeEmitter.fire();
  }

  async refreshRemote(force = false): Promise<void> {
    if (this.loadingRemote || (this.remote && !force)) {
      return;
    }
    this.loadingRemote = true;
    this.changeEmitter.fire();
    try {
      this.remote = await this.adapter.listRemote();
    } finally {
      this.loadingRemote = false;
      this.changeEmitter.fire();
    }
  }

  async use(version: string): Promise<void> {
    await this.adapter.use(version);
    if (this.adapter.managesTerminalEnv) {
      this.terminalEnv?.select(version, this.adapter.dir);
    }
    await this.refresh();
  }

  async install(version: string): Promise<void> {
    await this.adapter.install(version);
    this.remote = this.remote?.filter((item) => item.version !== version);
    await this.refresh();
  }

  async uninstall(version: string): Promise<void> {
    await this.adapter.uninstall(version);
    await this.refresh();
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }
}
