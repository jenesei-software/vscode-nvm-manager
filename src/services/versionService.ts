import * as vscode from "vscode";
import { setSwitchMode, switchMode } from "../config";
import {
  type AdapterCapabilities,
  type AdapterKind,
  type InstalledVersion,
  isPermissionError,
  type NvmAdapter,
  type RemoteVersion,
} from "../nvm/types";
import type { NodeDeclaration } from "../util/projectSignals";
import { bestMatch, satisfies } from "../util/semver";
import { isSafeVersion, resolveRequested } from "../util/version";
import type { TerminalEnv } from "./terminalEnvService";

export class VersionService {
  private installed: InstalledVersion[] = [];
  private remote?: RemoteVersion[];
  private currentVersion?: string;
  private loadingRemote = false;
  private terminalFallback = false;
  private fallbackNotified = false;

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

  adapterInfo(): {
    platform: NodeJS.Platform;
    dir: string;
    managesTerminalEnv: boolean;
    kind: AdapterKind;
    capabilities: AdapterCapabilities;
    switchMode: string;
  } {
    return {
      platform: process.platform,
      dir: this.adapter.dir,
      managesTerminalEnv: this.adapter.managesTerminalEnv,
      kind: this.adapter.kind,
      capabilities: this.adapter.capabilities,
      switchMode: this.usesTerminalEnv() ? "terminal" : switchMode(),
    };
  }

  capabilities(): AdapterCapabilities {
    return this.adapter.capabilities;
  }

  kind(): AdapterKind {
    return this.adapter.kind;
  }

  private usesTerminalEnv(): boolean {
    return (
      this.adapter.managesTerminalEnv ||
      switchMode() === "terminal" ||
      this.terminalFallback
    );
  }

  nvmVersion(): Promise<string | undefined> {
    return this.adapter.version();
  }

  resolve(requested: string): string | undefined {
    return resolveRequested(
      requested,
      this.installed.map((item) => item.version),
    );
  }

  resolveDeclaration(declared: NodeDeclaration): string | undefined {
    const installed = this.installed.map((item) => item.version);
    return declared.source === "engines"
      ? bestMatch(declared.raw, installed)
      : resolveRequested(declared.raw, installed);
  }

  resolveRemoteDeclaration(declared: NodeDeclaration): string | undefined {
    const remote = this.remote?.map((item) => item.version);
    if (!remote) {
      return undefined;
    }
    return declared.source === "engines"
      ? bestMatch(declared.raw, remote)
      : resolveRequested(declared.raw, remote);
  }

  isSatisfied(declared: NodeDeclaration): boolean {
    const current = this.currentVersion;
    if (!current) {
      return false;
    }
    if (declared.source === "engines") {
      return satisfies(current, declared.raw);
    }
    return current === this.resolveDeclaration(declared);
  }

  async refresh(): Promise<void> {
    const installed = await this.adapter.listInstalled();
    const current = this.usesTerminalEnv()
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
    this.assertVersion(version);
    const binDir = this.adapter.binDir(version);

    if (this.adapter.managesTerminalEnv) {
      await this.adapter.use(version);
      this.selectTerminal(version, binDir);
      await this.refresh();
      return;
    }

    if (switchMode() === "terminal" || this.terminalFallback) {
      this.selectTerminal(version, binDir);
      await this.refresh();
      return;
    }

    try {
      await this.adapter.use(version);
      this.terminalFallback = false;
      this.terminalEnv?.clear();
    } catch (error) {
      if (switchMode() === "auto" && isPermissionError(error)) {
        this.terminalFallback = true;
        this.selectTerminal(version, binDir);
        this.notifyFallback();
      } else {
        throw error;
      }
    }
    await this.refresh();
  }

  private selectTerminal(version: string, binDir: string): void {
    if (!binDir) {
      throw new Error(
        vscode.l10n.t(
          "NVM Manager: could not locate Node.js v{0} on disk.",
          version,
        ),
      );
    }
    this.terminalEnv?.select(version, binDir);
  }

  private notifyFallback(): void {
    if (this.fallbackNotified) {
      return;
    }
    this.fallbackNotified = true;
    void vscode.window
      .showInformationMessage(
        vscode.l10n.t(
          "NVM Manager: nvm use needs admin rights here. Node.js was switched in VS Code terminals instead — open a new terminal to apply.",
        ),
        vscode.l10n.t("Always use terminals"),
      )
      .then((choice) => {
        if (choice) {
          void setSwitchMode("terminal");
        }
      });
  }

  async install(version: string): Promise<void> {
    this.assertVersion(version);
    await this.adapter.install(version);
    this.remote = this.remote?.filter((item) => item.version !== version);
    await this.refresh();
  }

  async uninstall(version: string): Promise<void> {
    this.assertVersion(version);
    await this.adapter.uninstall(version);
    await this.refresh();
  }

  private assertVersion(version: string): void {
    if (!isSafeVersion(version)) {
      throw new Error(`refusing invalid Node.js version "${version}".`);
    }
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }
}
