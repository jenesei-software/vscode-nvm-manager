import * as vscode from "vscode";
import type { VersionService } from "../services/versionService";
import { isEol } from "../util/eol";

type TreeNode = GroupNode | VersionNode | RemoteVersionNode | LoadingNode;

interface GroupNode {
  kind: "installed" | "remote";
}

interface VersionNode {
  kind: "version";
  version: string;
  active: boolean;
}

interface RemoteVersionNode {
  kind: "remote-version";
  version: string;
  lts: string | false;
}

interface LoadingNode {
  kind: "loading";
}

export class VersionsTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changeEmitter.event;

  constructor(private readonly service: VersionService) {
    this.service.onDidChange(() => this.changeEmitter.fire());
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    switch (element.kind) {
      case "installed":
        return this.groupItem(
          vscode.l10n.t("Installed"),
          String(this.service.getInstalled().length),
          vscode.TreeItemCollapsibleState.Expanded,
          new vscode.ThemeIcon("versions"),
        );
      case "remote": {
        const remote = this.service.getRemote();
        const description = this.service.isLoadingRemote()
          ? vscode.l10n.t("loading")
          : remote
            ? String(remote.length)
            : undefined;
        return this.groupItem(
          vscode.l10n.t("Available"),
          description,
          vscode.TreeItemCollapsibleState.Collapsed,
          new vscode.ThemeIcon("cloud"),
        );
      }
      case "version": {
        const eol = isEol(element.version);
        const item = new vscode.TreeItem(
          `v${element.version}`,
          vscode.TreeItemCollapsibleState.None,
        );
        item.contextValue = element.active ? "active" : "installed";
        item.description =
          [
            element.active ? vscode.l10n.t("active") : undefined,
            eol ? "EOL" : undefined,
          ]
            .filter(Boolean)
            .join(" · ") || undefined;
        item.iconPath = element.active
          ? new vscode.ThemeIcon("check", new vscode.ThemeColor("charts.green"))
          : new vscode.ThemeIcon("circle-outline");
        item.command = {
          command: "nvmManager.use",
          title: vscode.l10n.t("Use This Version"),
          arguments: [element],
        };
        item.tooltip = `${
          element.active
            ? vscode.l10n.t("v{0} (active)", element.version)
            : vscode.l10n.t("Use v{0}", element.version)
        }${eol ? ` · ${vscode.l10n.t("end of life")}` : ""}`;
        return item;
      }
      case "remote-version": {
        const item = new vscode.TreeItem(
          `v${element.version}`,
          vscode.TreeItemCollapsibleState.None,
        );
        item.contextValue = "remote";
        item.description =
          [
            element.lts ? element.lts : undefined,
            isEol(element.version) ? "EOL" : undefined,
          ]
            .filter(Boolean)
            .join(" · ") || undefined;
        item.iconPath = new vscode.ThemeIcon("cloud-download");
        item.command = {
          command: "nvmManager.install",
          title: vscode.l10n.t("Install Version"),
          arguments: [element],
        };
        item.tooltip = vscode.l10n.t("Install v{0}", element.version);
        return item;
      }
      default: {
        const item = new vscode.TreeItem(
          vscode.l10n.t("Loading available versions..."),
          vscode.TreeItemCollapsibleState.None,
        );
        item.iconPath = new vscode.ThemeIcon("loading~spin");
        return item;
      }
    }
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) {
      return [{ kind: "installed" }, { kind: "remote" }];
    }
    if (element.kind === "installed") {
      return this.service.getInstalled().map(
        (item): VersionNode => ({
          kind: "version",
          version: item.version,
          active: item.active,
        }),
      );
    }
    if (element.kind === "remote") {
      const remote = this.service.getRemote();
      if (!remote) {
        void this.service.refreshRemote();
        return [{ kind: "loading" }];
      }
      return remote.map(
        (item): RemoteVersionNode => ({
          kind: "remote-version",
          version: item.version,
          lts: item.lts,
        }),
      );
    }
    return [];
  }

  private groupItem(
    label: string,
    description: string | undefined,
    state: vscode.TreeItemCollapsibleState,
    icon: vscode.ThemeIcon,
  ): vscode.TreeItem {
    const item = new vscode.TreeItem(label, state);
    item.description = description;
    item.iconPath = icon;
    item.contextValue = "group";
    return item;
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }
}
