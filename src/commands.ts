import * as vscode from "vscode";
import {
  hasWorkspace,
  readAutoSwitch,
  setAutoSwitchGlobal,
  setAutoSwitchWorkspace,
} from "./config";
import type { VersionService } from "./services/versionService";

interface CommandDependencies {
  service: VersionService;
}

function extractVersion(argument: unknown): string | undefined {
  if (typeof argument === "string") {
    return argument;
  }
  if (
    argument &&
    typeof argument === "object" &&
    "version" in argument &&
    typeof (argument as { version: unknown }).version === "string"
  ) {
    return (argument as { version: string }).version;
  }
  return undefined;
}

async function runUse(service: VersionService, version: string): Promise<void> {
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `NVM Manager: switching to v${version}...`,
      },
      () => service.use(version),
    );
    vscode.window.setStatusBarMessage(
      `NVM Manager: active Node.js v${version}`,
      4000,
    );
  } catch (error) {
    vscode.window.showErrorMessage(`NVM Manager: ${(error as Error).message}`);
  }
}

export function registerCommands(
  context: vscode.ExtensionContext,
  dependencies: CommandDependencies,
): void {
  const { service } = dependencies;

  context.subscriptions.push(
    vscode.commands.registerCommand("nvmManager.refresh", async () => {
      try {
        await service.refresh();
      } catch (error) {
        vscode.window.showErrorMessage(
          `NVM Manager: ${(error as Error).message}`,
        );
      }
    }),

    vscode.commands.registerCommand("nvmManager.refreshRemote", async () => {
      try {
        await service.refreshRemote(true);
      } catch (error) {
        vscode.window.showErrorMessage(
          `NVM Manager: ${(error as Error).message}`,
        );
      }
    }),

    vscode.commands.registerCommand("nvmManager.switch", async () => {
      const installed = service.getInstalled();
      if (installed.length === 0) {
        vscode.window.showWarningMessage(
          "NVM Manager: no installed Node.js versions found.",
        );
        return;
      }
      const picked = await vscode.window.showQuickPick(
        installed.map((item) => ({
          label: `v${item.version}`,
          description: item.active ? "active" : undefined,
        })),
        { placeHolder: "Select a Node.js version" },
      );
      if (picked) {
        await runUse(service, picked.label.slice(1));
      }
    }),

    vscode.commands.registerCommand("nvmManager.use", async (argument) => {
      const version = extractVersion(argument);
      if (version) {
        await runUse(service, version);
      }
    }),

    vscode.commands.registerCommand("nvmManager.install", async (argument) => {
      const version = extractVersion(argument);
      if (!version) {
        return;
      }
      try {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `NVM Manager: installing v${version}...`,
          },
          () => service.install(version),
        );
        vscode.window.setStatusBarMessage(
          `NVM Manager: installed v${version}`,
          4000,
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `NVM Manager: ${(error as Error).message}`,
        );
      }
    }),

    vscode.commands.registerCommand(
      "nvmManager.uninstall",
      async (argument) => {
        const version = extractVersion(argument);
        if (!version) {
          return;
        }
        const confirm = await vscode.window.showWarningMessage(
          `Uninstall Node.js v${version}?`,
          { modal: true },
          "Uninstall",
        );
        if (confirm !== "Uninstall") {
          return;
        }
        try {
          await service.uninstall(version);
          vscode.window.setStatusBarMessage(
            `NVM Manager: uninstalled v${version}`,
            4000,
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `NVM Manager: ${(error as Error).message}`,
          );
        }
      },
    ),

    vscode.commands.registerCommand(
      "nvmManager.copyVersion",
      async (argument) => {
        const version = extractVersion(argument);
        if (version) {
          await vscode.env.clipboard.writeText(version);
        }
      },
    ),

    vscode.commands.registerCommand(
      "nvmManager.toggleAutoSwitchGlobal",
      async () => {
        const next = !readAutoSwitch().global;
        await setAutoSwitchGlobal(next);
        vscode.window.setStatusBarMessage(
          `NVM Manager: global auto-switch ${next ? "enabled" : "disabled"}`,
          4000,
        );
      },
    ),

    vscode.commands.registerCommand(
      "nvmManager.toggleAutoSwitchWorkspace",
      async () => {
        if (!hasWorkspace()) {
          vscode.window.showWarningMessage(
            "NVM Manager: open a workspace to configure project auto-switch.",
          );
          return;
        }
        const next = !readAutoSwitch().effective;
        await setAutoSwitchWorkspace(next);
        vscode.window.setStatusBarMessage(
          `NVM Manager: project auto-switch ${next ? "enabled" : "disabled"}`,
          4000,
        );
      },
    ),

    vscode.commands.registerCommand("nvmManager.openSettings", async () => {
      await vscode.commands.executeCommand("nvmManager.settings.focus");
    }),
  );
}
