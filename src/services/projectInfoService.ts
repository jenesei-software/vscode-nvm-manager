import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { run } from "../util/exec";
import {
  detectPackageManager,
  isKnownPackageManager,
  type PackageManagerDetection,
} from "../util/packageManager";
import {
  collectNodeDeclarations,
  type NodeDeclaration,
  type NodeSource,
} from "../util/projectSignals";
import { satisfies } from "../util/semver";
import type { VersionService } from "./versionService";

export interface PackageAvailability {
  name: string;
  available: boolean;
  version?: string;
}

export interface ProjectInfo {
  hasFolder: boolean;
  trusted: boolean;
  folderName?: string;
  folderPath?: string;
  node: {
    declarations: NodeDeclaration[];
    declared?: string;
    declaredSource?: NodeSource;
    declaredFile?: string;
    resolved?: string;
    remoteResolved?: string;
    active?: string;
    matches: boolean;
    status: "no-folder" | "not-specified" | "resolved" | "no-match";
  };
  packageManager: PackageManagerDetection;
  availability?: PackageAvailability[];
  checkingAvailability: boolean;
}

const NO_FOLDER: ProjectInfo = {
  hasFolder: false,
  trusted: true,
  node: { declarations: [], matches: false, status: "no-folder" },
  packageManager: { conflicts: [] },
  checkingAvailability: false,
};

function readFile(file: string): string | undefined {
  try {
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined;
  } catch {
    return undefined;
  }
}

function readJson(file: string): unknown {
  const text = readFile(file);
  if (text === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const set = new Set(a);
  return b.every((value) => set.has(value));
}

export class ProjectInfoService {
  private info: ProjectInfo = NO_FOLDER;
  private availability?: PackageAvailability[];
  private checkingAvailability = false;

  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.changeEmitter.event;

  constructor(private readonly service: VersionService) {}

  getInfo(): ProjectInfo {
    return {
      ...this.info,
      availability: this.availability,
      checkingAvailability: this.checkingAvailability,
    };
  }

  refresh(): void {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      this.info = NO_FOLDER;
      this.availability = undefined;
      this.changeEmitter.fire();
      return;
    }

    const root = folder.uri.fsPath;
    const packageJson = readJson(path.join(root, "package.json"));
    const declarations = collectNodeDeclarations({
      nvmrc: readFile(path.join(root, ".nvmrc")),
      nodeVersion: readFile(path.join(root, ".node-version")),
      packageJson,
    });
    const declared = declarations[0];
    const active = this.service.getCurrent();
    const resolved = declared
      ? this.service.resolveDeclaration(declared)
      : undefined;
    const remoteResolved =
      declared && !resolved
        ? this.service.resolveRemoteDeclaration(declared)
        : undefined;
    if (declared && !resolved && this.service.getRemote() === undefined) {
      void this.service.refreshRemote();
    }

    const matches = Boolean(
      declared &&
        active &&
        (declared.source === "engines"
          ? satisfies(active, declared.raw)
          : active === resolved),
    );

    const hasFile = (relative: string) =>
      fs.existsSync(path.join(root, relative));

    this.info = {
      hasFolder: true,
      trusted: vscode.workspace.isTrusted,
      folderName: folder.name,
      folderPath: root,
      node: {
        declarations,
        declared: declared?.raw,
        declaredSource: declared?.source,
        declaredFile: declared?.file,
        resolved,
        remoteResolved,
        active,
        matches,
        status: !declared
          ? "not-specified"
          : resolved
            ? "resolved"
            : "no-match",
      },
      packageManager: detectPackageManager({ hasFile, packageJson }),
      checkingAvailability: this.checkingAvailability,
    };

    const candidates = this.candidates();
    if (
      this.availability &&
      !sameSet(
        this.availability.map((item) => item.name),
        candidates,
      )
    ) {
      this.availability = undefined;
    }

    this.changeEmitter.fire();
  }

  async ensureAvailability(): Promise<void> {
    if (!vscode.workspace.isTrusted) {
      return;
    }
    const candidates = this.candidates();
    if (this.availability || candidates.length === 0) {
      return;
    }
    this.checkingAvailability = true;
    this.changeEmitter.fire();
    try {
      this.availability = await Promise.all(
        candidates.map(async (name): Promise<PackageAvailability> => {
          const result = await run(name, ["-v"], 8000, { shell: true });
          if (result.code === 0) {
            const version = result.stdout.trim().split(/\r?\n/)[0];
            return { name, available: true, version: version || undefined };
          }
          return { name, available: false };
        }),
      );
    } finally {
      this.checkingAvailability = false;
      this.changeEmitter.fire();
    }
  }

  private candidates(): string[] {
    const manager = this.info.packageManager;
    const names = new Set<string>();
    if (manager.declared && isKnownPackageManager(manager.declared.name)) {
      names.add(manager.declared.name);
    }
    if (manager.detected) {
      names.add(manager.detected);
    }
    if (manager.used) {
      names.add(manager.used);
    }
    return [...names];
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }
}
