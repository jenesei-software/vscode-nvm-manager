# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.5] - 2026-09-24

### Changed

- Standardized the activity bar and view icons to a single-color 24×24 SVG.

### Fixed

- Auto-switch now resolves `engines.node` semver ranges and treats an already-satisfying active
  version as satisfied, instead of warning or switching to the highest installed match.

## [0.1.4] - 2026-09-24

### Added

- Project view: the declared Node.js version and its source (`.nvmrc`, `.node-version`,
  `engines.node`), the resolved and active versions with a match indicator, and package manager
  detection (declared, detected, in use, availability).
- Switch-to-declared and install-declared actions in the Project view.
- Semver range support for `engines.node` (`^`, `~`, `>=`, `<=`, `x`, `||`).

## [0.1.3] - 2026-09-24

### Changed

- Updated the README screenshot.

## [0.1.2] - 2026-09-24

### Changed

- Moved development instructions from the README to `CONTRIBUTING.md`.

### Removed

- The redundant status bar toggle and the `nvmManager.statusBar.enabled` setting; use the status bar
  context menu to show or hide the item.

## [0.1.1] - 2026-09-24

### Changed

- README: added the Marketplace link and badges, and made the intro platform-neutral.

## [0.1.0] - 2026-09-24

### Added

- macOS and Linux support via `nvm-sh`: installed versions are read from `nvm ls` / `nvm ls-remote`
  and the selected version is applied to the integrated terminals.

### Changed

- Rebalanced the logo wordmark to uppercase `NVM` for a more even look.
- Release and CI workflows run on Node.js 22 and pin the public npm registry in the lockfile.

## [0.0.1] - 2026-09-24

### Added

- Versions view in the activity bar: installed versions with the active one marked, and an
  Available list (`nvm list available`) you can install from.
- Switch the active version from the tree, the status bar, or the command palette.
- Auto-switch per project from `.nvmrc`, `.node-version` or `package.json` `engines.node`, with
  global and per-workspace toggles.
- Sidebar Settings panel: auto-switch global/project, ask-when-off, status bar.
- Install, uninstall and copy a version from the context menu.

[Unreleased]: https://github.com/jenesei-software/vscode-nvm-manager/compare/v0.1.5...HEAD
[0.1.5]: https://github.com/jenesei-software/vscode-nvm-manager/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/jenesei-software/vscode-nvm-manager/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/jenesei-software/vscode-nvm-manager/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/jenesei-software/vscode-nvm-manager/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/jenesei-software/vscode-nvm-manager/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/jenesei-software/vscode-nvm-manager/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/jenesei-software/vscode-nvm-manager/releases/tag/v0.0.1
