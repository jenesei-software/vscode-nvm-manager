import * as vscode from "vscode";

export const CONFIG_SECTION = "nvmManager";

export const KEYS = {
  nvmPath: "nvmPath",
  autoSwitch: "autoSwitch",
  askWhenAutoSwitchOff: "askWhenAutoSwitchOff",
  statusBarEnabled: "statusBar.enabled",
} as const;

export function getConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(CONFIG_SECTION);
}

export interface AutoSwitchState {
  effective: boolean;
  global: boolean;
  workspace?: boolean;
}

export function readAutoSwitch(): AutoSwitchState {
  const config = getConfig();
  const inspected = config.inspect<boolean>(KEYS.autoSwitch);
  const global = inspected?.globalValue ?? false;
  const workspace =
    inspected?.workspaceValue ?? inspected?.workspaceFolderValue;
  return {
    effective: workspace ?? global,
    global,
    workspace,
  };
}

export function hasWorkspace(): boolean {
  return (vscode.workspace.workspaceFolders?.length ?? 0) > 0;
}

export async function setAutoSwitchGlobal(value: boolean): Promise<void> {
  await getConfig().update(
    KEYS.autoSwitch,
    value,
    vscode.ConfigurationTarget.Global,
  );
}

export async function setAutoSwitchWorkspace(
  value: boolean | undefined,
): Promise<void> {
  if (!hasWorkspace()) {
    return;
  }
  await getConfig().update(
    KEYS.autoSwitch,
    value,
    vscode.ConfigurationTarget.Workspace,
  );
}

export async function setAskWhenAutoSwitchOff(value: boolean): Promise<void> {
  await getConfig().update(
    KEYS.askWhenAutoSwitchOff,
    value,
    vscode.ConfigurationTarget.Global,
  );
}

export async function setStatusBarEnabled(value: boolean): Promise<void> {
  await getConfig().update(
    KEYS.statusBarEnabled,
    value,
    vscode.ConfigurationTarget.Global,
  );
}

export function askWhenAutoSwitchOff(): boolean {
  return getConfig().get<boolean>(KEYS.askWhenAutoSwitchOff, true);
}

export function statusBarEnabled(): boolean {
  return getConfig().get<boolean>(KEYS.statusBarEnabled, true);
}

export function nvmPathSetting(): string {
  return getConfig().get<string>(KEYS.nvmPath, "");
}
