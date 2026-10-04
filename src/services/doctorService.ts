import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { nvmDirSetting, nvmPathSetting } from "../config";
import { run } from "../util/exec";
import type { VersionService } from "./versionService";

function line(label: string, value: string): string {
  return `${label.padEnd(18)}${value}`;
}

async function commandVersion(command: string): Promise<string | undefined> {
  const result = await run(command, ["-v"], 8000, { shell: true });
  if (result.code !== 0) {
    return undefined;
  }
  return result.stdout.trim().split(/\r?\n/)[0] || undefined;
}

export async function buildDoctorReport(
  service: VersionService,
): Promise<string> {
  const info = service.adapterInfo();
  const current = service.getCurrent();
  const lines: string[] = ["NVM Manager diagnostics", ""];

  lines.push(line("Platform", info.platform));
  lines.push(
    line("nvm kind", info.managesTerminalEnv ? "nvm-sh" : "nvm-windows"),
  );
  lines.push(line("nvm location", info.dir || "(unknown)"));
  lines.push(line("nvm exists", fs.existsSync(info.dir) ? "yes" : "no"));

  let nvmVersion: string | undefined;
  try {
    nvmVersion = await service.nvmVersion();
  } catch {
    nvmVersion = undefined;
  }
  lines.push(line("nvm version", nvmVersion ?? "unavailable"));
  lines.push(line("active Node.js", current ? `v${current}` : "none"));
  lines.push(line("installed", String(service.getInstalled().length)));
  lines.push(
    line("workspace trusted", vscode.workspace.isTrusted ? "yes" : "no"),
  );

  if (info.platform === "win32") {
    lines.push(line("NVM_HOME", process.env.NVM_HOME ?? "(unset)"));
    const symlink = process.env.NVM_SYMLINK;
    lines.push(line("NVM_SYMLINK", symlink ?? "(unset)"));
    if (symlink) {
      lines.push(
        line("symlink target", fs.existsSync(symlink) ? "present" : "missing"),
      );
      let writable = false;
      try {
        fs.accessSync(path.dirname(symlink), fs.constants.W_OK);
        writable = true;
      } catch {
        writable = false;
      }
      lines.push(
        line("symlink writable", writable ? "yes" : "no (may need admin)"),
      );
    }
    lines.push(line("configured path", nvmPathSetting() || "(auto)"));
  } else {
    lines.push(line("NVM_DIR", process.env.NVM_DIR ?? "(unset)"));
    lines.push(line("configured dir", nvmDirSetting() || "(auto)"));
  }

  lines.push(
    line("node on PATH", (await commandVersion("node")) ?? "not found"),
  );
  lines.push(line("npm on PATH", (await commandVersion("npm")) ?? "not found"));

  return lines.join("\n");
}
