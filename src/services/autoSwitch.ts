import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  askWhenAutoSwitchOff,
  readAutoSwitch,
  setAutoSwitchWorkspace,
} from "../config";
import {
  collectNodeDeclarations,
  type NodeDeclaration,
} from "../util/projectSignals";
import type { VersionService } from "./versionService";

function readFile(file: string): string | undefined {
  try {
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined;
  } catch {
    return undefined;
  }
}

function readJson(file: string): unknown {
  const text = readFile(file);
  if (text === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function readDeclaredNode(
  folder: vscode.WorkspaceFolder,
): NodeDeclaration | undefined {
  const root = folder.uri.fsPath;
  return collectNodeDeclarations({
    nvmrc: readFile(path.join(root, ".nvmrc")),
    nodeVersion: readFile(path.join(root, ".node-version")),
    packageJson: readJson(path.join(root, "package.json")),
  })[0];
}

export function readDesiredVersion(
  folder: vscode.WorkspaceFolder,
): string | undefined {
  return readDeclaredNode(folder)?.raw;
}

export class AutoSwitch {
  private running = false;

  constructor(private readonly service: VersionService) {}

  async apply(folder: vscode.WorkspaceFolder): Promise<void> {
    if (this.running || !vscode.workspace.isTrusted) {
      return;
    }
    this.running = true;
    try {
      const declared = readDeclaredNode(folder);
      if (!declared) {
        return;
      }

      const target = this.service.resolveDeclaration(declared);
      if (!target) {
        await this.offerInstall(declared);
        return;
      }
      if (this.service.isSatisfied(declared)) {
        return;
      }

      if (readAutoSwitch().effective) {
        await this.use(target);
        return;
      }

      if (!askWhenAutoSwitchOff()) {
        return;
      }

      const switchLabel = vscode.l10n.t("Switch");
      const alwaysLabel = vscode.l10n.t("Always for this project");
      const choice = await vscode.window.showInformationMessage(
        vscode.l10n.t(
          'NVM Manager: switch to Node.js v{0} for "{1}"?',
          target,
          folder.name,
        ),
        switchLabel,
        alwaysLabel,
      );
      if (choice === switchLabel) {
        await this.use(target);
      } else if (choice === alwaysLabel) {
        await setAutoSwitchWorkspace(true);
        await this.use(target);
      }
    } finally {
      this.running = false;
    }
  }

  private async offerInstall(declared: NodeDeclaration): Promise<void> {
    const message = vscode.l10n.t(
      'NVM Manager: no installed Node.js version matches "{0}".',
      declared.raw,
    );
    try {
      await this.service.refreshRemote();
    } catch {
      // Remote lookup is best effort; fall back to a plain warning below.
    }
    const remoteTarget = this.service.resolveRemoteDeclaration(declared);
    if (!remoteTarget) {
      vscode.window.showWarningMessage(message);
      return;
    }
    const installLabel = vscode.l10n.t("Install");
    const choice = await vscode.window.showWarningMessage(
      message,
      installLabel,
    );
    if (choice !== installLabel) {
      return;
    }
    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: vscode.l10n.t("NVM Manager: installing v{0}...", remoteTarget),
        },
        () => this.service.install(remoteTarget),
      );
      await this.use(remoteTarget);
    } catch (error) {
      vscode.window.showErrorMessage(
        vscode.l10n.t(
          "NVM Manager: failed to install v{0}. {1}",
          remoteTarget,
          (error as Error).message,
        ),
      );
    }
  }

  private async use(target: string): Promise<void> {
    try {
      await this.service.use(target);
      vscode.window.setStatusBarMessage(
        vscode.l10n.t("NVM Manager: switched to Node.js v{0}", target),
        4000,
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        vscode.l10n.t(
          "NVM Manager: failed to switch to v{0}. {1}",
          target,
          (error as Error).message,
        ),
      );
    }
  }
}
