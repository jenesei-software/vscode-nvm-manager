import * as vscode from "vscode";

export interface StatusBarProjectState {
  declared?: string;
  resolved?: string;
  matches: boolean;
  trusted: boolean;
}

export class StatusBar {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    );
    this.item.name = "NVM Manager";
    this.item.command = "nvmManager.switch";
  }

  update(version: string | undefined, project: StatusBarProjectState): void {
    this.item.backgroundColor = undefined;
    this.item.command = "nvmManager.switch";

    if (project.declared && !project.matches && project.trusted) {
      this.item.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground",
      );
      if (project.resolved) {
        this.item.text = `⬢ v${version ?? "?"} → v${project.resolved}`;
        this.item.command = "nvmManager.switchToDeclared";
        this.item.tooltip = vscode.l10n.t(
          "Project wants {0}, but the active version differs. Click to switch to v{1}.",
          project.declared,
          project.resolved,
        );
      } else {
        this.item.text = `$(warning) ${version ? `v${version}` : "nvm"}`;
        this.item.command = "nvmManager.installDeclared";
        this.item.tooltip = vscode.l10n.t(
          "Project wants {0}, which is not installed. Click to install.",
          project.declared,
        );
      }
      this.item.show();
      return;
    }

    if (project.declared && !project.matches && !project.trusted) {
      this.item.text = `${version ? `⬢ v${version}` : "⬢ nvm"} $(shield)`;
      this.item.tooltip = vscode.l10n.t(
        "A project version is declared. Trust the workspace to apply it.",
      );
      this.item.show();
      return;
    }

    this.item.text = version ? `⬢ v${version}` : "⬢ nvm";
    this.item.tooltip = version
      ? vscode.l10n.t(
          "NVM Manager: active Node.js v{0}. Click to switch.",
          version,
        )
      : vscode.l10n.t(
          "NVM Manager: no active Node.js version. Click to switch.",
        );
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
  }
}
