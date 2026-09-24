import { compareVersions } from "./version";

export interface ParsedInstalled {
  version: string;
  active: boolean;
}

export interface ParsedRemote {
  version: string;
  lts: string | false;
}

const VERSION_AT_START = /^v?(\d+\.\d+\.\d+)/;

export function parseUnixInstalled(output: string): ParsedInstalled[] {
  const versions: ParsedInstalled[] = [];
  const seen = new Set<string>();

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const active = trimmed.startsWith("->");
    const body = active ? trimmed.slice(2).trim() : trimmed;
    if (body.includes("->")) {
      continue;
    }
    const version = body.match(VERSION_AT_START)?.[1];
    if (!version || seen.has(version)) {
      continue;
    }
    seen.add(version);
    versions.push({ version, active });
  }

  return versions.sort((a, b) => compareVersions(b.version, a.version));
}

export function parseUnixRemote(output: string): ParsedRemote[] {
  const versions: ParsedRemote[] = [];
  const seen = new Set<string>();

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    const match = trimmed.match(/^v?(\d+\.\d+\.\d+)(?:\s+\(([^)]+)\))?/);
    if (!match) {
      continue;
    }
    const version = match[1];
    if (seen.has(version)) {
      continue;
    }
    seen.add(version);
    const label = match[2]?.replace(/^Latest\s+/, "").trim();
    versions.push({ version, lts: label ? label : false });
  }

  return versions.sort((a, b) => compareVersions(b.version, a.version));
}
