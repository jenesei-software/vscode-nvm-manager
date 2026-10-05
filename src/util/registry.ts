import type { PackageManager } from "./packageManager";

export const DEFAULT_REGISTRY = "https://registry.npmjs.org/";

export interface RegistryValue {
  url: string;
  source: string;
}

export interface ScopedRegistry {
  scope: string;
  url: string;
  source: string;
}

export interface RegistryInfo {
  project?: RegistryValue;
  global?: RegistryValue;
  effective: RegistryValue;
  differs: boolean;
  scoped: ScopedRegistry[];
}

export interface RegistryFiles {
  npmrc?: string;
  yarnrc?: string;
  yarnrcYml?: string;
  bunfig?: string;
}

export interface GlobalRegistryInput {
  npmrc?: string;
  command?: string;
}

export interface ParsedRegistry {
  registry?: string;
  scoped: Array<{ scope: string; url: string }>;
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

function isComment(line: string): boolean {
  return line.startsWith("#") || line.startsWith(";");
}

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

export function parseNpmrc(text: string): ParsedRegistry {
  let registry: string | undefined;
  const scoped: Array<{ scope: string; url: string }> = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || isComment(line)) {
      continue;
    }
    const match = /^(?:(@[^:=\s]+):)?registry\s*=\s*(.+)$/i.exec(line);
    if (!match) {
      continue;
    }
    const url = stripQuotes((match[2] ?? "").split(/\s+#/)[0]);
    if (!url) {
      continue;
    }
    const scope = match[1];
    if (scope) {
      scoped.push({ scope, url });
    } else if (!registry) {
      registry = url;
    }
  }
  return { registry, scoped };
}

export function parseYarnrc(text: string): string | undefined {
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || isComment(line)) {
      continue;
    }
    const match = /^registry\s*(?:=\s*|\s+)(.+)$/i.exec(line);
    if (match) {
      const url = stripQuotes(match[1] ?? "");
      if (url) {
        return url;
      }
    }
  }
  return undefined;
}

export function parseYarnrcYml(text: string): string | undefined {
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || isComment(line)) {
      continue;
    }
    const match = /^npmRegistryServer:\s*(.+)$/i.exec(line);
    if (match) {
      const url = stripQuotes((match[1] ?? "").split(/\s+#/)[0]);
      if (url) {
        return url;
      }
    }
  }
  return undefined;
}

export function parseBunfig(text: string): string | undefined {
  let inInstall = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || isComment(line)) {
      continue;
    }
    const section = /^\[(.+)\]$/.exec(line);
    if (section) {
      inInstall = section[1]?.trim().toLowerCase() === "install";
      continue;
    }
    if (!inInstall) {
      continue;
    }
    const match = /^registry\s*=\s*(.+)$/i.exec(line);
    if (match) {
      const url = stripQuotes((match[1] ?? "").split(/\s+#/)[0]);
      if (url) {
        return url;
      }
    }
  }
  return undefined;
}

interface ProjectSource {
  key: keyof RegistryFiles;
  source: string;
  parse: (text: string) => ParsedRegistry;
}

function fileParser(
  key: keyof RegistryFiles,
  source: string,
  parse: (text: string) => string | undefined,
): ProjectSource {
  return {
    key,
    source,
    parse: (text) => {
      const registry = parse(text);
      return registry ? { registry, scoped: [] } : { scoped: [] };
    },
  };
}

const NPMRC_SOURCE: ProjectSource = {
  key: "npmrc",
  source: ".npmrc",
  parse: parseNpmrc,
};

const YARNRC_SOURCE = fileParser("yarnrc", ".yarnrc", parseYarnrc);
const YARNRC_YML_SOURCE = fileParser(
  "yarnrcYml",
  ".yarnrc.yml",
  parseYarnrcYml,
);
const BUNFIG_SOURCE = fileParser("bunfig", "bunfig.toml", parseBunfig);

function projectOrder(manager?: PackageManager): ProjectSource[] {
  const all = [NPMRC_SOURCE, YARNRC_YML_SOURCE, YARNRC_SOURCE, BUNFIG_SOURCE];
  switch (manager) {
    case "yarn":
      return [YARNRC_YML_SOURCE, YARNRC_SOURCE, NPMRC_SOURCE, BUNFIG_SOURCE];
    case "bun":
      return [BUNFIG_SOURCE, NPMRC_SOURCE, YARNRC_YML_SOURCE, YARNRC_SOURCE];
    default:
      return all;
  }
}

function resolveProject(
  manager: PackageManager | undefined,
  files: RegistryFiles,
): { project?: RegistryValue; scoped: ScopedRegistry[] } {
  let project: RegistryValue | undefined;
  for (const source of projectOrder(manager)) {
    const text = files[source.key];
    if (text === undefined || project) {
      continue;
    }
    const parsed = source.parse(text);
    if (parsed.registry) {
      project = { url: parsed.registry, source: source.source };
    }
  }
  const scoped: ScopedRegistry[] = files.npmrc
    ? parseNpmrc(files.npmrc).scoped.map((entry) => ({
        scope: entry.scope,
        url: entry.url,
        source: ".npmrc",
      }))
    : [];
  return { project, scoped };
}

function resolveGlobal(input: GlobalRegistryInput): RegistryValue | undefined {
  const fromCommand = input.command?.split(/\r?\n/)[0]?.trim();
  if (fromCommand) {
    return { url: fromCommand, source: "npm config" };
  }
  if (input.npmrc) {
    const parsed = parseNpmrc(input.npmrc);
    if (parsed.registry) {
      return { url: parsed.registry, source: "~/.npmrc" };
    }
  }
  return undefined;
}

export function detectRegistry(input: {
  manager?: PackageManager;
  project: RegistryFiles;
  global: GlobalRegistryInput;
}): RegistryInfo {
  const { project, scoped } = resolveProject(input.manager, input.project);
  const global = resolveGlobal(input.global);
  const effective = project ??
    global ?? { url: DEFAULT_REGISTRY, source: "default" };
  const differs = Boolean(
    project && global && normalize(project.url) !== normalize(global.url),
  );

  const merged = new Map<string, ScopedRegistry>();
  if (input.global.npmrc) {
    for (const entry of parseNpmrc(input.global.npmrc).scoped) {
      merged.set(entry.scope, {
        scope: entry.scope,
        url: entry.url,
        source: "~/.npmrc",
      });
    }
  }
  for (const entry of scoped) {
    merged.set(entry.scope, entry);
  }

  return {
    project,
    global,
    effective,
    differs,
    scoped: [...merged.values()],
  };
}
