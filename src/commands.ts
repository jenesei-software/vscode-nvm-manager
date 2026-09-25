import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  hasWorkspace,
  readAutoSwitch,
  setAutoSwitchGlobal,
  setAutoSwitchWorkspace,
} from "./config";
import { buildDoctorReport } from "./services/doctor";
import type { ProjectInfoService } from "./services/projectInfo";
import type { VersionService } from "./services/versionService";
import { buildPinContent, choosePinFile } from "./util/pinFile";
import { compareVersions } from "./util/version";

interface CommandDependencies {
  service: VersionService;
  projectInfo: ProjectInfoService;
  output: vscode.OutputChannel;
}

type SwitchPick = vscode.QuickPickItem & {
  version?: string;
  install?: boolean;
};

function highest(versions: string[]): string | undefined {
  return versions.reduce<string | undefined>(
    (best, current) =>
      best === undefined || compareVersions(current, best) > 0 ? current : best,
    undefined,
  );
}

function requireTrusted(): boolean {
  if (vscode.workspace.isTrusted) {
    return true;
  }
  void vscode.window.showWarningMessage(
    vscode.l10n.t(
      "NVM Manager: trust this workspace to manage versions declared by project files.",
    ),
  );
  return false;
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

function errorMessage(error: unknown): string {
  return vscode.l10n.t("NVM Manager: {0}", (error as Error).message);
}

async function runUse(service: VersionService, version: string): Promise<void> {
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: vscode.l10n.t("NVM Manager: switching to v{0}...", version),
      },
      () => service.use(version),
    );
    vscode.window.setStatusBarMessage(
      vscode.l10n.t("NVM Manager: active Node.js v{0}", version),
      4000,
    );
  } catch (error) {
    vscode.window.showErrorMessage(errorMessage(error));
  }
}

async function runInstall(
  service: VersionService,
  version: string,
): Promise<void> {
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: vscode.l10n.t("NVM Manager: installing v{0}...", version),
      },
      () => service.install(version),
    );
    vscode.window.setStatusBarMessage(
      vscode.l10n.t("NVM Manager: installed v{0}", version),
      4000,
    );
  } catch (error) {
    vscode.window.showErrorMessage(errorMessage(error));
  }
}

export function registerCommands(
  context: vscode.ExtensionContext,
  dependencies: CommandDependencies,
): void {
  const { service, projectInfo, output } = dependencies;

  context.subscriptions.push(
    vscode.commands.registerCommand("nvmManager.refresh", async () => {
      try {
        await service.refresh();
      } catch (error) {
        vscode.window.showErrorMessage(errorMessage(error));
      }
    }),

    vscode.commands.registerCommand("nvmManager.refreshRemote", async () => {
      try {
        await service.refreshRemote(true);
      } catch (error) {
        vscode.window.showErrorMessage(errorMessage(error));
      }
    }),

    vscode.commands.registerCommand("nvmManager.switch", async () => {
      const installed = service.getInstalled();
      const node = projectInfo.getInfo().node;
      const picks: SwitchPick[] = [];

      const byMajor = new Map<string, typeof installed>();
      for (const item of installed) {
        const major = item.version.split(".")[0] ?? item.version;
        const list = byMajor.get(major) ?? [];
        list.push(item);
        byMajor.set(major, list);
      }
      for (const [major, list] of byMajor) {
        picks.push({
          label: vscode.l10n.t("Node {0}", major),
          kind: vscode.QuickPickItemKind.Separator,
        });
        for (const item of list) {
          const declared = node.resolved === item.version;
          const description = [
            item.active ? vscode.l10n.t("active") : undefined,
            declared ? vscode.l10n.t("declared") : undefined,
          ]
            .filter(Boolean)
            .join(" · ");
          picks.push({
            label: `v${item.version}`,
            description: description || undefined,
            version: item.version,
          });
        }
      }

      const remote = service.getRemote();
      if (remote) {
        const latestLts = highest(
          remote
            .filter((item) => item.lts !== false)
            .map((item) => item.version),
        );
        const latest = remote[0]?.version;
        if (latestLts || latest) {
          picks.push({
            label: vscode.l10n.t("Install"),
            kind: vscode.QuickPickItemKind.Separator,
          });
        }
        if (latestLts) {
          picks.push({
            label: vscode.l10n.t("$(cloud-download) Install latest LTS"),
            description: `v${latestLts}`,
            version: latestLts,
            install: true,
          });
        }
        if (latest && latest !== latestLts) {
          picks.push({
            label: vscode.l10n.t("$(cloud-download) Install latest"),
            description: `v${latest}`,
            version: latest,
            install: true,
          });
        }
      } else {
        void service.refreshRemote();
      }

      if (picks.length === 0) {
        vscode.window.showWarningMessage(
          vscode.l10n.t("NVM Manager: no installed Node.js versions found."),
        );
        return;
      }

      const picked = await vscode.window.showQuickPick(picks, {
        placeHolder: node.declared
          ? vscode.l10n.t(
              "Select a Node.js version (project: {0})",
              node.declared,
            )
          : vscode.l10n.t("Select a Node.js version"),
        matchOnDescription: true,
      });
      if (!picked?.version) {
        return;
      }
      if (picked.install) {
        await runInstall(service, picked.version);
      } else {
        await runUse(service, picked.version);
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
      if (version) {
        await runInstall(service, version);
      }
    }),

    vscode.commands.registerCommand(
      "nvmManager.uninstall",
      async (argument) => {
        const version = extractVersion(argument);
        if (!version) {
          return;
        }
        const uninstall = vscode.l10n.t("Uninstall");
        const confirm = await vscode.window.showWarningMessage(
          vscode.l10n.t("Uninstall Node.js v{0}?", version),
          { modal: true },
          uninstall,
        );
        if (confirm !== uninstall) {
          return;
        }
        try {
          await service.uninstall(version);
          vscode.window.setStatusBarMessage(
            vscode.l10n.t("NVM Manager: uninstalled v{0}", version),
            4000,
          );
        } catch (error) {
          vscode.window.showErrorMessage(errorMessage(error));
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
          vscode.l10n.t(
            "NVM Manager: global auto-switch {0}",
            next ? vscode.l10n.t("enabled") : vscode.l10n.t("disabled"),
          ),
          4000,
        );
      },
    ),

    vscode.commands.registerCommand(
      "nvmManager.toggleAutoSwitchWorkspace",
      async () => {
        if (!hasWorkspace()) {
          vscode.window.showWarningMessage(
            vscode.l10n.t(
              "NVM Manager: open a workspace to configure project auto-switch.",
            ),
          );
          return;
        }
        const next = !readAutoSwitch().effective;
        await setAutoSwitchWorkspace(next);
        vscode.window.setStatusBarMessage(
          vscode.l10n.t(
            "NVM Manager: project auto-switch {0}",
            next ? vscode.l10n.t("enabled") : vscode.l10n.t("disabled"),
          ),
          4000,
        );
      },
    ),

    vscode.commands.registerCommand("nvmManager.switchToDeclared", async () => {
      if (!requireTrusted()) {
        return;
      }
      const resolved = projectInfo.getInfo().node.resolved;
      if (resolved) {
        await runUse(service, resolved);
      }
    }),

    vscode.commands.registerCommand("nvmManager.installDeclared", async () => {
      if (!requireTrusted()) {
        return;
      }
      const node = projectInfo.getInfo().node;
      const target =
        node.remoteResolved ??
        (node.declaredSource !== "engines" ? node.declared : undefined);
      if (!target) {
        vscode.window.showWarningMessage(
          vscode.l10n.t("NVM Manager: could not resolve a version to install."),
        );
        return;
      }
      await runInstall(service, target);
    }),

    vscode.commands.registerCommand("nvmManager.pinVersion", async () => {
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder) {
        vscode.window.showWarningMessage(
          vscode.l10n.t("NVM Manager: open a workspace to pin a version."),
        );
        return;
      }
      const active = service.getCurrent();
      if (!active) {
        vscode.window.showWarningMessage(
          vscode.l10n.t("NVM Manager: no active Node.js version to pin."),
        );
        return;
      }
      const root = folder.uri.fsPath;
      const file = choosePinFile({
        nvmrc: fs.existsSync(path.join(root, ".nvmrc")),
        nodeVersion: fs.existsSync(path.join(root, ".node-version")),
      });
      const uri = vscode.Uri.joinPath(folder.uri, file);
      await vscode.workspace.fs.writeFile(
        uri,
        Buffer.from(buildPinContent(active), "utf8"),
      );
      projectInfo.refresh();
      const open = vscode.l10n.t("Open");
      const choice = await vscode.window.showInformationMessage(
        vscode.l10n.t("NVM Manager: pinned Node.js v{0} to {1}.", active, file),
        open,
      );
      if (choice === open) {
        await vscode.window.showTextDocument(uri);
      }
    }),

    vscode.commands.registerCommand("nvmManager.checkPackages", async () => {
      await projectInfo.ensureAvailability();
    }),

    vscode.commands.registerCommand("nvmManager.doctor", async () => {
      const report = await buildDoctorReport(service);
      output.appendLine(report);
      output.show(true);
      const copy = vscode.l10n.t("Copy");
      const choice = await vscode.window.showInformationMessage(
        vscode.l10n.t(
          "NVM Manager: diagnostics written to the NVM Manager output channel.",
        ),
        copy,
      );
      if (choice === copy) {
        await vscode.env.clipboard.writeText(report);
      }
    }),
  );
}
