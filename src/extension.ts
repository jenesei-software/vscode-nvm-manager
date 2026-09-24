import * as vscode from "vscode";
import { registerCommands } from "./commands";
import {
  askWhenAutoSwitchOff,
  hasWorkspace,
  nvmDirSetting,
  nvmPathSetting,
  readAutoSwitch,
  setAskWhenAutoSwitchOff,
  setAutoSwitchGlobal,
  setAutoSwitchWorkspace,
} from "./config";
import { createAdapter } from "./nvm";
import { AutoSwitch } from "./services/autoSwitch";
import { TerminalEnv } from "./services/terminalEnv";
import { VersionService } from "./services/versionService";
import { StatusBar } from "./statusBar";
import {
  type SettingsState,
  SettingsViewProvider,
} from "./views/settingsViewProvider";
import { VersionsTreeProvider } from "./views/versionsTreeProvider";

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  const output = vscode.window.createOutputChannel("NVM Manager");
  context.subscriptions.push(output);

  const terminalEnv = new TerminalEnv(
    context.workspaceState,
    context.environmentVariableCollection,
  );
  await terminalEnv.restore();

  let service: VersionService;
  try {
    const adapter = await createAdapter(nvmPathSetting(), nvmDirSetting());
    service = new VersionService(adapter, terminalEnv);
  } catch (error) {
    const message = (error as Error).message;
    output.appendLine(message);
    vscode.window.showErrorMessage(`NVM Manager: ${message}`);
    return;
  }
  context.subscriptions.push(service);

  const statusBar = new StatusBar();
  context.subscriptions.push(statusBar);

  const treeProvider = new VersionsTreeProvider(service);
  context.subscriptions.push(treeProvider);

  const settingsProvider = new SettingsViewProvider({
    getState(): SettingsState {
      const auto = readAutoSwitch();
      return {
        hasWorkspace: hasWorkspace(),
        activeVersion: service.getCurrent(),
        autoSwitchGlobal: auto.global,
        autoSwitchWorkspace: auto.workspace,
        askWhenOff: askWhenAutoSwitchOff(),
      };
    },
    setAutoSwitchGlobal,
    setAutoSwitchWorkspace,
    setAskWhenOff: setAskWhenAutoSwitchOff,
    switchVersion: async () => {
      await vscode.commands.executeCommand("nvmManager.switch");
    },
  });

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SettingsViewProvider.viewType,
      settingsProvider,
    ),
    vscode.window.registerTreeDataProvider("nvmManager.versions", treeProvider),
  );

  const autoSwitch = new AutoSwitch(service);

  const updateUi = (): void => {
    statusBar.update(service.getCurrent());
    settingsProvider.refresh();
  };
  service.onDidChange(updateUi);

  const runAutoSwitch = async (): Promise<void> => {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (folder) {
      await autoSwitch.apply(folder);
    }
  };

  registerCommands(context, { service });

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration("nvmManager")) {
        return;
      }
      updateUi();
      if (event.affectsConfiguration("nvmManager.autoSwitch")) {
        void runAutoSwitch();
      }
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      updateUi();
      void runAutoSwitch();
    }),
    vscode.workspace.onDidSaveTextDocument((document) => {
      const name = document.uri.path.split("/").pop();
      if (
        name === ".nvmrc" ||
        name === ".node-version" ||
        name === "package.json"
      ) {
        void runAutoSwitch();
      }
    }),
  );

  try {
    await service.refresh();
  } catch (error) {
    const message = (error as Error).message;
    output.appendLine(message);
    vscode.window.showErrorMessage(`NVM Manager: ${message}`);
  }

  updateUi();
  void service.refreshRemote();
  void runAutoSwitch();
}

export function deactivate(): void {
  // Disposables are released through the extension context.
}
