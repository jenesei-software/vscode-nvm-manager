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
    if (this.running) {
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
        vscode.window.showWarningMessage(
          `NVM Manager: no installed Node.js version matches "${declared.raw}".`,
        );
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

      const choice = await vscode.window.showInformationMessage(
        `NVM Manager: switch to Node.js v${target} for "${folder.name}"?`,
        "Switch",
        "Always for this project",
      );
      if (choice === "Switch") {
        await this.use(target);
      } else if (choice === "Always for this project") {
        await setAutoSwitchWorkspace(true);
        await this.use(target);
      }
    } finally {
      this.running = false;
    }
  }

  private async use(target: string): Promise<void> {
    try {
      await this.service.use(target);
      vscode.window.setStatusBarMessage(
        `NVM Manager: switched to Node.js v${target}`,
        4000,
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `NVM Manager: failed to switch to v${target}. ${(error as Error).message}`,
      );
    }
  }
}
