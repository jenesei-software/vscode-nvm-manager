// Node.js release end-of-life (YYYY-MM) by major version.
const EOL: Record<number, string> = {
  12: "2022-04",
  14: "2023-04",
  16: "2023-09",
  18: "2025-04",
  20: "2026-04",
  22: "2027-04",
  24: "2028-04",
  26: "2029-04",
};

export function eolDate(version: string): string | undefined {
  const major = Number(version.split(".")[0]);
  return Number.isFinite(major) ? EOL[major] : undefined;
}

export function isEol(version: string, now: Date = new Date()): boolean {
  const eol = eolDate(version);
  if (!eol) {
    return false;
  }
  const [year, month] = eol.split("-").map(Number);
  return now >= new Date(year, month, 1);
}
