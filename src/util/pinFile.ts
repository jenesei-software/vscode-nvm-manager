export type PinFileName = ".nvmrc" | ".node-version";

export function normalizePinVersion(version: string): string {
  const trimmed = version.trim();
  return trimmed.startsWith("v") ? trimmed.slice(1) : trimmed;
}

export function buildPinContent(version: string): string {
  return `${normalizePinVersion(version)}\n`;
}

export function choosePinFile(existing: {
  nvmrc: boolean;
  nodeVersion: boolean;
}): PinFileName {
  if (existing.nodeVersion && !existing.nvmrc) {
    return ".node-version";
  }
  return ".nvmrc";
}
