export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

export const PACKAGE_MANAGERS: readonly PackageManager[] = [
  "npm",
  "yarn",
  "pnpm",
  "bun",
];

export function isKnownPackageManager(name: string): name is PackageManager {
  return (PACKAGE_MANAGERS as readonly string[]).includes(name);
}

export interface DeclaredPackageManager {
  name: string;
  version?: string;
  source: "packageManager" | "devEngines";
}

export interface PackageManagerDetection {
  declared?: DeclaredPackageManager;
  detected?: PackageManager;
  detectedFrom?: string;
  used?: PackageManager;
  usedFrom?: string;
  conflicts: string[];
}

const LOCKFILES: Array<[string, PackageManager]> = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["bun.lockb", "bun"],
  ["bun.lock", "bun"],
  ["package-lock.json", "npm"],
];

const USE_MARKERS: Array<[string, PackageManager]> = [
  ["node_modules/.pnpm", "pnpm"],
  ["node_modules/.yarn-state.yml", "yarn"],
  ["node_modules/.package-lock.json", "npm"],
];

function parseNameVersion(spec: string): {
  name: string;
  version?: string;
} | null {
  const trimmed = spec.trim();
  if (!trimmed) {
    return null;
  }
  const index = trimmed.lastIndexOf("@");
  if (index <= 0) {
    return { name: trimmed };
  }
  const version = trimmed.slice(index + 1).split("+")[0];
  return { name: trimmed.slice(0, index), version: version || undefined };
}

function parseDeclared(
  packageJson: unknown,
): DeclaredPackageManager | undefined {
  if (!packageJson || typeof packageJson !== "object") {
    return undefined;
  }
  const record = packageJson as {
    packageManager?: unknown;
    devEngines?: { packageManager?: unknown };
  };

  if (typeof record.packageManager === "string") {
    const parsed = parseNameVersion(record.packageManager);
    if (parsed) {
      return {
        name: parsed.name,
        version: parsed.version,
        source: "packageManager",
      };
    }
  }

  const devEngines = record.devEngines?.packageManager;
  const entries = Array.isArray(devEngines)
    ? devEngines
    : devEngines
      ? [devEngines]
      : [];
  for (const entry of entries) {
    if (
      entry &&
      typeof entry === "object" &&
      typeof (entry as { name?: unknown }).name === "string"
    ) {
      const name = (entry as { name: string }).name;
      const version = (entry as { version?: unknown }).version;
      return {
        name,
        version: typeof version === "string" ? version : undefined,
        source: "devEngines",
      };
    }
  }

  return undefined;
}

export function detectPackageManager(input: {
  hasFile: (relativePath: string) => boolean;
  packageJson?: unknown;
}): PackageManagerDetection {
  const declared = parseDeclared(input.packageJson);
  const conflicts: string[] = [];

  const lockfiles = LOCKFILES.filter(([file]) => input.hasFile(file));
  if (lockfiles.length > 1) {
    conflicts.push(
      `multiple lockfiles: ${lockfiles.map(([file]) => file).join(", ")}`,
    );
  }
  const detected = lockfiles[0]?.[1];
  const detectedFrom = lockfiles[0]?.[0];

  const marker = USE_MARKERS.find(([file]) => input.hasFile(file));
  let used = marker?.[1];
  let usedFrom = marker?.[0];
  if (!used && input.hasFile("node_modules") && detected === "bun") {
    used = "bun";
    usedFrom = "bun.lockb";
  }

  if (declared && detected && declared.name !== detected) {
    conflicts.push(
      `"${declared.name}" is declared but ${detectedFrom} suggests ${detected}`,
    );
  }

  return { declared, detected, detectedFrom, used, usedFrom, conflicts };
}
