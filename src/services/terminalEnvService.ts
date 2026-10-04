import * as path from "node:path";
import type * as vscode from "vscode";

const SELECTED_VERSION_KEY = "nvmManager.selectedVersion";

interface SavedSelection {
  version: string;
  dir: string;
}

/**
 * On Unix nvm cannot change the running process, so the selected version is
 * injected into every integrated terminal through a PATH prepend.
 */
export class TerminalEnv {
  private selected?: string;

  constructor(
    private readonly memento: vscode.Memento,
    private readonly collection: vscode.EnvironmentVariableCollection,
  ) {}

  getSelected(): string | undefined {
    return this.selected;
  }

  select(version: string, dir: string): void {
    this.selected = version;
    this.apply(version, dir);
    void this.memento.update(SELECTED_VERSION_KEY, { version, dir });
  }

  async restore(): Promise<void> {
    const saved = this.memento.get<SavedSelection>(SELECTED_VERSION_KEY);
    if (!saved) {
      return;
    }
    this.selected = saved.version;
    this.apply(saved.version, saved.dir);
  }

  clear(): void {
    this.selected = undefined;
    this.collection.clear();
    void this.memento.update(SELECTED_VERSION_KEY, undefined);
  }

  private apply(version: string, dir: string): void {
    const bin = path.posix.join(dir, "versions", "node", `v${version}`, "bin");
    this.collection.clear();
    this.collection.prepend("PATH", bin);
    this.collection.description = `NVM Manager: Node.js v${version}`;
  }
}
