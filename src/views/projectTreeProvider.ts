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
          vscode.l10n.t("Workspace not trusted"),
          vscode.TreeItemCollapsibleState.None,
        );
        item.description = vscode.l10n.t("actions disabled");
        item.iconPath = new vscode.ThemeIcon(
          "shield",
          new vscode.ThemeColor("list.warningForeground"),
        );
        item.tooltip = vscode.l10n.t(
          "Trust this workspace to auto-switch, install or probe versions declared by project files.",
        );
        return item;
      }
      case "group": {
        const isNode = element.group === "node";
        const item = new vscode.TreeItem(
          isNode ? vscode.l10n.t("Node") : vscode.l10n.t("Package manager"),
          vscode.TreeItemCollapsibleState.Expanded,
        );
        item.iconPath = new vscode.ThemeIcon(isNode ? "versions" : "package");
        item.contextValue = "group";
        return item;
      }
      case "node-declared": {
        const item = new vscode.TreeItem(
          vscode.l10n.t("Declared"),
          vscode.TreeItemCollapsibleState.None,
        );
        item.description = `${element.declaration.raw} · ${NODE_SOURCE_LABEL[element.declaration.source]}`;
        item.iconPath = new vscode.ThemeIcon("file-code");
        item.tooltip = vscode.l10n.t("Open {0}", element.declaration.file);
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
          vscode.l10n.t("Resolved"),
          vscode.TreeItemCollapsibleState.None,
        );
        item.description = resolved
          ? `v${resolved}`
          : remoteResolved
            ? vscode.l10n.t("install v{0}", remoteResolved)
            : vscode.l10n.t("no match");
        item.iconPath = resolved
          ? new vscode.ThemeIcon("check", new vscode.ThemeColor("charts.green"))
          : new vscode.ThemeIcon("circle-slash");
        item.contextValue = resolved ? "projectResolved" : "projectNoMatch";
        item.tooltip = resolved
          ? vscode.l10n.t("Matches installed v{0}", resolved)
          : remoteResolved
            ? vscode.l10n.t(
                "Not installed — click to install v{0}",
                remoteResolved,
              )
            : vscode.l10n.t("No installed version matches — install it");
        return item;
      }
      case "node-active": {
        const { active, resolved, matches } = info.node;
        const item = new vscode.TreeItem(
          vscode.l10n.t("Active"),
          vscode.TreeItemCollapsibleState.None,
        );
        item.description = active
          ? matches
            ? vscode.l10n.t("v{0} · matches", active)
            : vscode.l10n.t("v{0} · differs", active)
          : vscode.l10n.t("none");
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
            title: vscode.l10n.t("Switch to Project Version"),
          };
          item.tooltip = vscode.l10n.t(
            "Active v{0} differs from v{1} — click to switch",
            active,
            resolved,
          );
        } else if (active && matches) {
          item.tooltip = vscode.l10n.t(
            "Active v{0} matches the project declaration",
            active,
          );
        }
        return item;
      }
      case "pm-declared": {
        const declared = info.packageManager.declared;
        const item = new vscode.TreeItem(
          vscode.l10n.t("Declared"),
          vscode.TreeItemCollapsibleState.None,
        );
        item.description = declared
          ? `${declared.name}${declared.version ? `@${declared.version}` : ""} · ${declared.source}`
          : vscode.l10n.t("none");
        item.iconPath = new vscode.ThemeIcon("package");
        if (info.folderPath) {
          item.command = this.openCommand(info.folderPath, "package.json");
        }
        return item;
      }
      case "pm-detected": {
        const manager = info.packageManager;
        const item = new vscode.TreeItem(
          vscode.l10n.t("Detected"),
          vscode.TreeItemCollapsibleState.None,
        );
        item.description = manager.detected
          ? `${manager.detected} · ${manager.detectedFrom}`
          : vscode.l10n.t("unknown");
        item.iconPath = new vscode.ThemeIcon("search");
        return item;
      }
      case "pm-used": {
        const manager = info.packageManager;
        const item = new vscode.TreeItem(
          vscode.l10n.t("In use"),
          vscode.TreeItemCollapsibleState.None,
        );
        item.description = manager.used
          ? `${manager.used} · ${manager.usedFrom}`
          : vscode.l10n.t("not installed");
        item.iconPath = new vscode.ThemeIcon(
          manager.used ? "check" : "circle-outline",
        );
        return item;
      }
      case "pm-check": {
        const item = new vscode.TreeItem(
          element.checking
            ? vscode.l10n.t("Checking availability...")
            : vscode.l10n.t("Check availability"),
          vscode.TreeItemCollapsibleState.None,
        );
        item.iconPath = new vscode.ThemeIcon(
          element.checking ? "loading~spin" : "sync",
        );
        if (!element.checking) {
          item.command = {
            command: "nvmManager.checkPackages",
            title: vscode.l10n.t("Check Package Manager Availability"),
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
          ? (element.item.version ?? vscode.l10n.t("available"))
          : vscode.l10n.t("not found");
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
        return [{ kind: "empty", message: vscode.l10n.t("No folder opened") }];
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
      title: vscode.l10n.t("Open"),
      arguments: [vscode.Uri.file(path.join(root, file))],
    };
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }
}
