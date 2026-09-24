import { compareVersions } from "./version";

export interface Semver {
  major: number;
  minor: number;
  patch: number;
}

interface PartialVersion {
  any: boolean;
  major?: number;
  minor?: number;
  patch?: number;
}

const TOKEN = /^(>=|<=|>|<|=|\^|~)?\s*(.*)$/;

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === "x" || value === "*") {
    return undefined;
  }
  return Number(value);
}

function parseVersion(raw: string): Semver | undefined {
  const match = raw.trim().match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) {
    return undefined;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2] ?? "0"),
    patch: Number(match[3] ?? "0"),
  };
}

function parsePartial(raw: string): PartialVersion | undefined {
  const value = raw.trim();
  if (value === "" || value === "*" || value === "x") {
    return { any: true };
  }
  const match = value.match(/^v?(\d+|[x*])(?:\.(\d+|[x*]))?(?:\.(\d+|[x*]))?/);
  if (!match) {
    return undefined;
  }
  const major = toNumber(match[1]);
  if (major === undefined) {
    return { any: true };
  }
  return {
    any: false,
    major,
    minor: toNumber(match[2]),
    patch: toNumber(match[3]),
  };
}

function compare(a: Semver, b: Semver): number {
  return compareVersions(
    `${a.major}.${a.minor}.${a.patch}`,
    `${b.major}.${b.minor}.${b.patch}`,
  );
}

function equal(a: Semver, b: PartialVersion): boolean {
  if (b.major !== undefined && a.major !== b.major) {
    return false;
  }
  if (b.minor !== undefined && a.minor !== b.minor) {
    return false;
  }
  if (b.patch !== undefined && a.patch !== b.patch) {
    return false;
  }
  return true;
}

function greaterOrEqual(a: Semver, b: PartialVersion): boolean {
  if (b.major === undefined) {
    return true;
  }
  if (a.major !== b.major) {
    return a.major > b.major;
  }
  if (b.minor === undefined) {
    return true;
  }
  if (a.minor !== b.minor) {
    return a.minor > b.minor;
  }
  if (b.patch === undefined) {
    return true;
  }
  return a.patch >= b.patch;
}

function greaterThan(a: Semver, b: PartialVersion): boolean {
  if (b.major === undefined) {
    return false;
  }
  if (a.major !== b.major) {
    return a.major > b.major;
  }
  if (b.minor === undefined) {
    return false;
  }
  if (a.minor !== b.minor) {
    return a.minor > b.minor;
  }
  if (b.patch === undefined) {
    return false;
  }
  return a.patch > b.patch;
}

function lessOrEqual(a: Semver, b: PartialVersion): boolean {
  return !greaterThan(a, b);
}

function lessThan(a: Semver, b: PartialVersion): boolean {
  return !greaterOrEqual(a, b);
}

function caretUpper(version: PartialVersion): Semver {
  const major = version.major ?? 0;
  const minor = version.minor ?? 0;
  const patch = version.patch ?? 0;
  if (major > 0 || version.minor === undefined) {
    return { major: major + 1, minor: 0, patch: 0 };
  }
  if (minor > 0 || version.patch === undefined) {
    return { major, minor: minor + 1, patch: 0 };
  }
  return { major, minor, patch: patch + 1 };
}

function matchesCaret(version: Semver, partial: PartialVersion): boolean {
  if (partial.major === undefined) {
    return true;
  }
  if (partial.major === 0 && partial.minor === undefined) {
    return version.major === 0;
  }
  const low: Semver = {
    major: partial.major,
    minor: partial.minor ?? 0,
    patch: partial.patch ?? 0,
  };
  const upper = caretUpper(partial);
  return compare(version, low) >= 0 && compare(version, upper) < 0;
}

function matchesTilde(version: Semver, partial: PartialVersion): boolean {
  if (partial.major === undefined) {
    return true;
  }
  const low: Semver = {
    major: partial.major,
    minor: partial.minor ?? 0,
    patch: partial.patch ?? 0,
  };
  const upper: Semver =
    partial.minor === undefined
      ? { major: partial.major + 1, minor: 0, patch: 0 }
      : { major: partial.major, minor: partial.minor + 1, patch: 0 };
  return compare(version, low) >= 0 && compare(version, upper) < 0;
}

function matchesToken(version: Semver, token: string): boolean {
  const match = token.match(TOKEN);
  if (!match) {
    return false;
  }
  const operator = match[1];
  const partial = parsePartial(match[2]);
  if (!partial) {
    return false;
  }
  if (partial.any) {
    return true;
  }

  switch (operator) {
    case ">=":
      return greaterOrEqual(version, partial);
    case ">":
      return greaterThan(version, partial);
    case "<=":
      return lessOrEqual(version, partial);
    case "<":
      return lessThan(version, partial);
    case "^":
      return matchesCaret(version, partial);
    case "~":
      return matchesTilde(version, partial);
    case "=":
      return equal(version, partial);
    default:
      if (partial.minor === undefined) {
        return version.major === partial.major;
      }
      if (partial.patch === undefined) {
        return (
          version.major === partial.major && version.minor === partial.minor
        );
      }
      return equal(version, partial);
  }
}

export function satisfies(version: string, range: string): boolean {
  const parsed = parseVersion(version);
  if (!parsed) {
    return false;
  }
  const groups = range
    .split("||")
    .map((group) => group.trim())
    .filter((group) => group.length > 0);
  if (groups.length === 0) {
    return true;
  }
  return groups.some((group) => {
    const tokens = group.split(/[\s,]+/).filter((token) => token.length > 0);
    if (tokens.length === 0) {
      return true;
    }
    return tokens.every((token) => matchesToken(parsed, token));
  });
}

export function bestMatch(
  range: string,
  versions: string[],
): string | undefined {
  const matches = versions.filter((version) => satisfies(version, range));
  return matches.reduce<string | undefined>(
    (best, current) =>
      best === undefined || compareVersions(current, best) > 0 ? current : best,
    undefined,
  );
}
