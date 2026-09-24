import * as vscode from "vscode";

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

  update(version?: string): void {
    this.item.text = version ? `⬢ v${version}` : "⬢ nvm";
    this.item.tooltip = version
      ? `NVM Manager: active Node.js v${version}. Click to switch.`
      : "NVM Manager: no active Node.js version. Click to switch.";
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
  }
}
