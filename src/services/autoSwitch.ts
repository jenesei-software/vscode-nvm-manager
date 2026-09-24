import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  askWhenAutoSwitchOff,
  readAutoSwitch,
  setAutoSwitchWorkspace,
} from "../config";
import { parseEnginesNode, parseNvmrc } from "../util/version";
import type { VersionService } from "./versionService";

function readFirstLine(file: string): string | undefined {
  try {
    if (!fs.existsSync(file)) {
      return undefined;
    }
    return parseNvmrc(fs.readFileSync(file, "utf8"));
  } catch {
    return undefined;
  }
}

function readEnginesNode(root: string): string | undefined {
  try {
    const file = path.join(root, "package.json");
    if (!fs.existsSync(file)) {
      return undefined;
    }
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as {
      engines?: { node?: unknown };
    };
    const node = parsed.engines?.node;
    return typeof node === "string" ? parseEnginesNode(node) : undefined;
  } catch {
    return undefined;
  }
}

export function readDesiredVersion(
  folder: vscode.WorkspaceFolder,
): string | undefined {
  const root = folder.uri.fsPath;
  return (
    readFirstLine(path.join(root, ".nvmrc")) ??
    readFirstLine(path.join(root, ".node-version")) ??
    readEnginesNode(root)
  );
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
      const desired = readDesiredVersion(folder);
      if (!desired) {
        return;
      }

      const target = this.service.resolve(desired);
      if (!target) {
        vscode.window.showWarningMessage(
          `NVM Manager: no installed Node.js version matches "${desired}".`,
        );
        return;
      }
      if (this.service.getCurrent() === target) {
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
