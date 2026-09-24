export type RequestedKind =
  | "exact"
  | "major"
  | "prefix"
  | "latest"
  | "lts"
  | "unknown";

export interface RequestedVersion {
  raw: string;
  kind: RequestedKind;
  major?: number;
  prefix?: string;
}

const EXACT = /^\d+\.\d+\.\d+$/;
const MAJOR = /^\d+$/;
const PARTIAL = /^\d+\.\d+$/;

export function parseRequested(raw: string): RequestedVersion {
  const value = raw.trim().toLowerCase();
  const cleaned = value.startsWith("v") ? value.slice(1) : value;

  if (!cleaned) {
    return { raw, kind: "unknown" };
  }
  if (EXACT.test(cleaned)) {
    return { raw, kind: "exact" };
  }
  if (MAJOR.test(cleaned)) {
    return { raw, kind: "major", major: Number(cleaned) };
  }
  if (PARTIAL.test(cleaned)) {
    return { raw, kind: "prefix", prefix: cleaned };
  }
  if (cleaned === "lts" || cleaned.startsWith("lts/")) {
    return { raw, kind: "lts" };
  }
  if (
    cleaned === "node" ||
    cleaned === "latest" ||
    cleaned === "current" ||
    cleaned === "*"
  ) {
    return { raw, kind: "latest" };
  }
  return { raw, kind: "unknown" };
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number(n));
  const pb = b.split(".").map((n) => Number(n));
  for (let i = 0; i < 3; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) {
      return da - db;
    }
  }
  return 0;
}

function highest(versions: string[]): string | undefined {
  return versions.reduce<string | undefined>(
    (best, current) =>
      best === undefined || compareVersions(current, best) > 0 ? current : best,
    undefined,
  );
}

function isLtsMajor(version: string): boolean {
  const major = Number(version.split(".")[0]);
  return Number.isFinite(major) && major >= 4 && major % 2 === 0;
}

export function resolveRequested(
  raw: string,
  installed: string[],
): string | undefined {
  const requested = parseRequested(raw);

  switch (requested.kind) {
    case "exact":
      return installed.includes(stripV(raw)) ? stripV(raw) : undefined;
    case "major": {
      const matches = installed.filter(
        (version) => Number(version.split(".")[0]) === requested.major,
      );
      return highest(matches);
    }
    case "prefix": {
      const prefix = `${requested.prefix}.`;
      const matches = installed.filter((version) => version.startsWith(prefix));
      return highest(matches);
    }
    case "latest":
      return highest(installed);
    case "lts": {
      const lts = installed.filter(isLtsMajor);
      return highest(lts) ?? highest(installed);
    }
    default:
      return undefined;
  }
}

function stripV(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("v") ? trimmed.slice(1) : trimmed;
}

export function parseNvmrc(raw: string): string | undefined {
  const line = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith("#"));
  return line || undefined;
}

export function parseEnginesNode(raw: string): string | undefined {
  const cleaned = raw.trim();
  if (!cleaned) {
    return undefined;
  }
  const exact = cleaned.match(/(\d+\.\d+\.\d+)/);
  if (exact) {
    return exact[1];
  }
  const major = cleaned.match(/(\d+)/);
  if (major) {
    return major[1];
  }
  return undefined;
}
