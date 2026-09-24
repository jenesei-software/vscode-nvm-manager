# NVM Manager

[![Marketplace](https://img.shields.io/badge/marketplace-NVM%20Manager-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=jenesei-software.nvm-manager)
[![Version](https://img.shields.io/badge/version-0.1.3-2ea44f)](https://marketplace.visualstudio.com/items?itemName=jenesei-software.nvm-manager)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-2ea44f)](https://marketplace.visualstudio.com/items?itemName=jenesei-software.nvm-manager)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A VS Code extension for **nvm**: see every installed Node.js version, switch the active one, and
let a project pin its version through `.nvmrc` — all without leaving the editor.

Works with **nvm-windows** on Windows and **nvm-sh** on macOS/Linux: switching repoints the global
nvm symlink on Windows and updates the integrated terminal environment on macOS/Linux.

<p><img src="docs/screenshot.png" alt="NVM Manager" width="400"></p>

## Features

- **Versions view** in the activity bar: installed versions with the active one marked, plus an
  **Available** list (`nvm list available` / `nvm ls-remote`) you can install from.
- **Switch in one click** from the tree, the status bar, or the command palette
  (`NVM: Switch Node.js Version...`).
- **Active version in the status bar** — click it to switch.
- **Auto-switch per project**: reads `.nvmrc`, then `.node-version`, then `package.json`
  `engines.node`, resolves it against the installed list (`22`, `v22.16.0`, `22.16`, `lts/*`,
  `node`) and switches.
- **Global and per-project toggles** in the sidebar **Settings** panel:
  - global auto-switch,
  - project override (inherits the global value until you change it),
  - "ask when off" — prompt before switching when auto-switch is disabled.
- **Manage versions**: install, uninstall and copy a version from the context menu.

## Requirements

- **Windows**: [nvm-windows](https://github.com/coreybutler/nvm-windows) installed and `nvm`
  available. Auto-detects `nvm.exe` from `NVM_HOME`, then `PATH`, or set `nvmManager.nvmPath`.
- **macOS / Linux**: [nvm-sh](https://github.com/nvm-sh/nvm) installed. Auto-detects `NVM_DIR`
  or `~/.nvm`, or set `nvmManager.nvmDir`. Switching applies to VS Code's integrated terminals.

## Installation

- From the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=jenesei-software.nvm-manager),
  or from the Command Palette (`Ctrl+P` / `Cmd+P`): `ext install jenesei-software.nvm-manager`.
- Or install a local build: **Extensions** view → `...` → **Install from VSIX...**.

## Getting started

1. Open the **NVM Manager** icon in the activity bar.
2. The **Versions** view lists what is installed; the active version has a green check.
3. Click a version (or the status bar item) to switch. On macOS/Linux, open a **new** integrated
   terminal to pick up the change.
4. Open **Settings** in the same container to configure auto-switch.

To pin a project version, add `.nvmrc` at the repository root:

```
22.16.0
```

## Settings

| Setting | Default | Scope | Description |
| --- | --- | --- | --- |
| `nvmManager.autoSwitch` | `false` | resource | Auto-switch the active version from `.nvmrc` / `.node-version` / `package.json`. Set globally or per workspace. |
| `nvmManager.askWhenAutoSwitchOff` | `true` | window | Ask before switching when auto-switch is disabled. |
| `nvmManager.nvmPath` | `""` | machine-overridable | Windows only. Absolute path to `nvm.exe`. Empty means auto-detect. |
| `nvmManager.nvmDir` | `""` | machine-overridable | macOS / Linux only. Path to `NVM_DIR`. Empty means auto-detect. |

When auto-switch is on, opening a workspace silently switches to the pinned version. When it is
off and **Ask when off** is on, a notification offers **Switch** and **Always for this project**.

## Commands

| Command | Description |
| --- | --- |
| `NVM: Refresh` | Reload the installed list and the active version. |
| `NVM: Switch Node.js Version...` | Pick a version from a quick pick. |
| `NVM: Refresh Available Versions` | Reload `nvm list available`. |
| `NVM: Toggle Auto-switch (Global)` | Flip the global auto-switch setting. |
| `NVM: Toggle Auto-switch (This Project)` | Flip the project override. |

## Support the project

NVM Manager is free and open source. If it is useful to you:

- ⭐ **Star the repository** — it helps other people find it.
- ☕ **[DonationAlerts](https://www.donationalerts.com/r/cyrilstrone)** — a one-time donation keeps the project alive.

## License

Released under the [MIT License](LICENSE).
