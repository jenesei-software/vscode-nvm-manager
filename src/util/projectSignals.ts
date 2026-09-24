import { parseNvmrc } from "./version";

export type NodeSource = "nvmrc" | "node-version" | "engines";

export interface NodeDeclaration {
  raw: string;
  source: NodeSource;
  file: string;
}

export const NODE_SOURCE_LABEL: Record<NodeSource, string> = {
  nvmrc: ".nvmrc",
  "node-version": ".node-version",
  engines: "package.json engines.node",
};

export function collectNodeDeclarations(input: {
  nvmrc?: string;
  nodeVersion?: string;
  packageJson?: unknown;
}): NodeDeclaration[] {
  const declarations: NodeDeclaration[] = [];

  const nvmrc = input.nvmrc ? parseNvmrc(input.nvmrc) : undefined;
  if (nvmrc) {
    declarations.push({ raw: nvmrc, source: "nvmrc", file: ".nvmrc" });
  }

  const nodeVersion = input.nodeVersion
    ? parseNvmrc(input.nodeVersion)
    : undefined;
  if (nodeVersion) {
    declarations.push({
      raw: nodeVersion,
      source: "node-version",
      file: ".node-version",
    });
  }

  const engines = readEnginesNode(input.packageJson);
  if (engines) {
    declarations.push({
      raw: engines,
      source: "engines",
      file: "package.json",
    });
  }

  return declarations;
}

export function readEnginesNode(packageJson: unknown): string | undefined {
  if (!packageJson || typeof packageJson !== "object") {
    return undefined;
  }
  const node = (packageJson as { engines?: { node?: unknown } }).engines?.node;
  return typeof node === "string" && node.trim() ? node.trim() : undefined;
}
