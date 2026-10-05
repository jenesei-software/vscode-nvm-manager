import * as vscode from "vscode";

export const CONFIG_SECTION = "nvmManager";

export const KEYS = {
  nvmPath: "nvmPath",
  nvmDir: "nvmDir",
  autoSwitch: "autoSwitch",
  askWhenAutoSwitchOff: "askWhenAutoSwitchOff",
  registryAdvanced: "registryAdvanced",
  switchMode: "switchMode",
  nodeVersionsRoots: "nodeVersionsRoots",
} as const;

export type SwitchMode = "auto" | "system" | "terminal";

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

export function askWhenAutoSwitchOff(): boolean {
  return getConfig().get<boolean>(KEYS.askWhenAutoSwitchOff, true);
}

export function registryAdvanced(): boolean {
  return getConfig().get<boolean>(KEYS.registryAdvanced, false);
}

export function switchMode(): SwitchMode {
  const value = getConfig().get<string>(KEYS.switchMode, "auto");
  return value === "system" || value === "terminal" ? value : "auto";
}

export async function setSwitchMode(value: SwitchMode): Promise<void> {
  await getConfig().update(
    KEYS.switchMode,
    value,
    vscode.ConfigurationTarget.Global,
  );
}

export function nodeVersionsRoots(): string[] {
  const value = getConfig().get<string[]>(KEYS.nodeVersionsRoots, []);
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.trim() !== "",
  );
}

export function nvmPathSetting(): string {
  return getConfig().get<string>(KEYS.nvmPath, "");
}

export function nvmDirSetting(): string {
  return getConfig().get<string>(KEYS.nvmDir, "");
}
