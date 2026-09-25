import * as path from "node:path";
import * as vscode from "vscode";
import type {
  PackageAvailability,
  ProjectInfoService,
} from "../services/projectInfo";
import {
  NODE_SOURCE_LABEL,
  type NodeDeclaration,
} from "../util/projectSignals";

type ProjectNode =
  | { kind: "empty"; message: string }
  | { kind: "untrusted" }
  | { kind: "group"; group: "node" | "packageManager" }
  | { kind: "node-declared"; declaration: NodeDeclaration }
  | { kind: "node-resolved" }
  | { kind: "node-active" }
  | { kind: "pm-declared" }
  | { kind: "pm-detected" }
  | { kind: "pm-used" }
  | { kind: "pm-check"; checking: boolean }
  | { kind: "pm-available"; item: PackageAvailability }
  | { kind: "pm-conflict"; message: string };

export class ProjectTreeProvider
  implements vscode.TreeDataProvider<ProjectNode>
{
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changeEmitter.event;

  constructor(private readonly service: ProjectInfoService) {
    this.service.onDidChange(() => this.changeEmitter.fire());
  }

  getTreeItem(element: ProjectNode): vscode.TreeItem {
    const info = this.service.getInfo();

    switch (element.kind) {
      case "empty": {
        const item = new vscode.TreeItem(
          element.message,
          vscode.TreeItemCollapsibleState.None,
        );
        item.iconPath = new vscode.ThemeIcon("info");
        return item;
      }
      case "untrusted": {
        const item = new vscode.TreeItem(
          "Workspace not trusted",
          vscode.TreeItemCollapsibleState.None,
        );
        item.description = "actions disabled";
        item.iconPath = new vscode.ThemeIcon(
          "shield",
          new vscode.ThemeColor("list.warningForeground"),
        );
        item.tooltip =
          "Trust this workspace to auto-switch, install or probe versions declared by project files.";
        return item;
      }
      case "group": {
        const isNode = element.group === "node";
        const item = new vscode.TreeItem(
          isNode ? "Node" : "Package manager",
          vscode.TreeItemCollapsibleState.Expanded,
        );
        item.iconPath = new vscode.ThemeIcon(isNode ? "versions" : "package");
        item.contextValue = "group";
        return item;
      }
      case "node-declared": {
        const item = new vscode.TreeItem(
          "Declared",
          vscode.TreeItemCollapsibleState.None,
        );
        item.description = `${element.declaration.raw} · ${NODE_SOURCE_LABEL[element.declaration.source]}`;
        item.iconPath = new vscode.ThemeIcon("file-code");
        item.tooltip = `Open ${element.declaration.file}`;
        item.command = this.openCommand(
          info.folderPath,
          element.declaration.file,
        );
        return item;
      }
      case "node-resolved": {
        const resolved = info.node.resolved;
        const remoteResolved = info.node.remoteResolved;
        const item = new vscode.TreeItem(
          "Resolved",
          vscode.TreeItemCollapsibleState.None,
        );
        item.description = resolved
          ? `v${resolved}`
          : remoteResolved
            ? `install v${remoteResolved}`
            : "no match";
        item.iconPath = resolved
          ? new vscode.ThemeIcon("check", new vscode.ThemeColor("charts.green"))
          : new vscode.ThemeIcon("circle-slash");
        item.contextValue = resolved ? "projectResolved" : "projectNoMatch";
        item.tooltip = resolved
          ? `Matches installed v${resolved}`
          : remoteResolved
            ? `Not installed — click to install v${remoteResolved}`
            : "No installed version matches — install it";
        return item;
      }
      case "node-active": {
        const { active, resolved, matches } = info.node;
        const item = new vscode.TreeItem(
          "Active",
          vscode.TreeItemCollapsibleState.None,
        );
        item.description = active
          ? matches
            ? `v${active} · matches`
            : `v${active} · differs`
          : "none";
        item.iconPath = active
          ? matches
            ? new vscode.ThemeIcon(
                "check",
                new vscode.ThemeColor("charts.green"),
              )
            : new vscode.ThemeIcon(
                "warning",
                new vscode.ThemeColor("list.warningForeground"),
              )
          : new vscode.ThemeIcon("circle-outline");
        item.contextValue = active
          ? matches
            ? "projectActiveMatched"
            : "projectActiveDiffers"
          : "projectActiveNone";
        if (active && !matches && resolved) {
          item.command = {
            command: "nvmManager.switchToDeclared",
            title: "Switch to Project Version",
          };
          item.tooltip = `Active v${active} differs from v${resolved} — click to switch`;
        } else if (active && matches) {
          item.tooltip = `Active v${active} matches the project declaration`;
        }
        return item;
      }
      case "pm-declared": {
        const declared = info.packageManager.declared;
        const item = new vscode.TreeItem(
          "Declared",
          vscode.TreeItemCollapsibleState.None,
        );
        item.description = declared
          ? `${declared.name}${declared.version ? `@${declared.version}` : ""} · ${declared.source}`
          : "none";
        item.iconPath = new vscode.ThemeIcon("package");
        if (info.folderPath) {
          item.command = this.openCommand(info.folderPath, "package.json");
        }
        return item;
      }
      case "pm-detected": {
        const manager = info.packageManager;
        const item = new vscode.TreeItem(
          "Detected",
          vscode.TreeItemCollapsibleState.None,
        );
        item.description = manager.detected
          ? `${manager.detected} · ${manager.detectedFrom}`
          : "unknown";
        item.iconPath = new vscode.ThemeIcon("search");
        return item;
      }
      case "pm-used": {
        const manager = info.packageManager;
        const item = new vscode.TreeItem(
          "In use",
          vscode.TreeItemCollapsibleState.None,
        );
        item.description = manager.used
          ? `${manager.used} · ${manager.usedFrom}`
          : "not installed";
        item.iconPath = new vscode.ThemeIcon(
          manager.used ? "check" : "circle-outline",
        );
        return item;
      }
      case "pm-check": {
        const item = new vscode.TreeItem(
          element.checking ? "Checking availability..." : "Check availability",
          vscode.TreeItemCollapsibleState.None,
        );
        item.iconPath = new vscode.ThemeIcon(
          element.checking ? "loading~spin" : "sync",
        );
        if (!element.checking) {
          item.command = {
            command: "nvmManager.checkPackages",
            title: "Check Package Manager Availability",
          };
        }
        return item;
      }
      case "pm-available": {
        const item = new vscode.TreeItem(
          element.item.name,
          vscode.TreeItemCollapsibleState.None,
        );
        item.description = element.item.available
          ? (element.item.version ?? "available")
          : "not found";
        item.iconPath = element.item.available
          ? new vscode.ThemeIcon("check", new vscode.ThemeColor("charts.green"))
          : new vscode.ThemeIcon("circle-slash");
        return item;
      }
      default: {
        const item = new vscode.TreeItem(
          element.message,
          vscode.TreeItemCollapsibleState.None,
        );
        item.iconPath = new vscode.ThemeIcon(
          "warning",
          new vscode.ThemeColor("list.warningForeground"),
        );
        return item;
      }
    }
  }

  getChildren(element?: ProjectNode): ProjectNode[] {
    const info = this.service.getInfo();

    if (!element) {
      if (!info.hasFolder) {
        return [{ kind: "empty", message: "No folder opened" }];
      }
      const roots: ProjectNode[] = [
        { kind: "group", group: "node" },
        { kind: "group", group: "packageManager" },
      ];
      if (!info.trusted) {
        roots.push({ kind: "untrusted" });
      }
      return roots;
    }

    if (element.kind !== "group") {
      return [];
    }

    if (element.group === "node") {
      const children: ProjectNode[] = info.node.declarations.map(
        (declaration): ProjectNode => ({ kind: "node-declared", declaration }),
      );
      children.push({ kind: "node-resolved" });
      children.push({ kind: "node-active" });
      return children;
    }

    const manager = info.packageManager;
    const children: ProjectNode[] = [];
    if (manager.declared) {
      children.push({ kind: "pm-declared" });
    }
    children.push({ kind: "pm-detected" });
    children.push({ kind: "pm-used" });

    for (const message of manager.conflicts) {
      children.push({ kind: "pm-conflict", message });
    }

    if (info.availability) {
      for (const item of info.availability) {
        children.push({ kind: "pm-available", item });
      }
    } else if (info.checkingAvailability) {
      children.push({ kind: "pm-check", checking: true });
    } else {
      children.push({ kind: "pm-check", checking: false });
      if (info.trusted) {
        void this.service.ensureAvailability();
      }
    }

    return children;
  }

  private openCommand(
    root: string | undefined,
    file: string,
  ): vscode.Command | undefined {
    if (!root) {
      return undefined;
    }
    return {
      command: "vscode.open",
      title: "Open",
      arguments: [vscode.Uri.file(path.join(root, file))],
    };
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }
}
