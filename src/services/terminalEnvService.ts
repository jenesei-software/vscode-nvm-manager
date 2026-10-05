import type * as vscode from "vscode";

const SELECTED_VERSION_KEY = "nvmManager.selectedVersion";

interface SavedSelection {
  version: string;
  binDir: string;
}

/**
 * Node cannot be changed in the process that hosts the extension, so the
 * selected version is injected into every integrated terminal through a PATH
 * prepend. This works without administrator rights and leaves the system
 * untouched.
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

  select(version: string, binDir: string): void {
    this.selected = version;
    this.apply(version, binDir);
    void this.memento.update(SELECTED_VERSION_KEY, { version, binDir });
  }

  async restore(): Promise<void> {
    const saved = this.memento.get<SavedSelection>(SELECTED_VERSION_KEY);
    if (!saved?.binDir) {
      return;
    }
    this.selected = saved.version;
    this.apply(saved.version, saved.binDir);
  }

  clear(): void {
    this.selected = undefined;
    this.collection.clear();
    void this.memento.update(SELECTED_VERSION_KEY, undefined);
  }

  private apply(version: string, binDir: string): void {
    this.collection.clear();
    if (!binDir) {
      return;
    }
    this.collection.prepend("PATH", binDir);
    this.collection.description = `NVM Manager: Node.js v${version}`;
  }
}
