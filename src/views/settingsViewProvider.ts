import type * as vscode from "vscode";
import { getSettingsHtml } from "./webview/settingsHtml";

export interface SettingsState {
  hasWorkspace: boolean;
  activeVersion?: string;
  nvmLocation?: string;
  autoSwitchGlobal: boolean;
  autoSwitchWorkspace?: boolean;
  askWhenOff: boolean;
}

export interface SettingsController {
  getState(): SettingsState;
  setAutoSwitchGlobal(value: boolean): Promise<void>;
  setAutoSwitchWorkspace(value: boolean | undefined): Promise<void>;
  setAskWhenOff(value: boolean): Promise<void>;
  switchVersion(): Promise<void>;
  runDoctor(): Promise<void>;
}

interface WebviewMessage {
  type: string;
  key?: string;
  value?: boolean;
}

export class SettingsViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "nvmManager.settings";

  private view?: vscode.WebviewView;

  constructor(private readonly controller: SettingsController) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = getSettingsHtml(view.webview);
    view.webview.onDidReceiveMessage((message: WebviewMessage) => {
      void this.handleMessage(message);
    });
    view.onDidDispose(() => {
      this.view = undefined;
    });
  }

  refresh(): void {
    this.postState();
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.type) {
      case "ready":
        this.postState();
        return;
      case "update":
        await this.applyUpdate(message.key, message.value);
        break;
      case "switch":
        await this.controller.switchVersion();
        break;
      case "doctor":
        await this.controller.runDoctor();
        return;
      case "resetWorkspace":
        await this.controller.setAutoSwitchWorkspace(undefined);
        break;
      default:
        return;
    }
    this.postState();
  }

  private async applyUpdate(key?: string, value?: boolean): Promise<void> {
    if (value === undefined) {
      return;
    }
    switch (key) {
      case "autoSwitchGlobal":
        await this.controller.setAutoSwitchGlobal(value);
        break;
      case "autoSwitchWorkspace":
        await this.controller.setAutoSwitchWorkspace(value);
        break;
      case "askWhenOff":
        await this.controller.setAskWhenOff(value);
        break;
      default:
        break;
    }
  }

  private postState(): void {
    void this.view?.webview.postMessage({
      type: "state",
      state: this.controller.getState(),
    });
  }
}
