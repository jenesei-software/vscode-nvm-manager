# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- macOS and Linux support via `nvm-sh`: installed versions are read from `nvm ls` / `nvm ls-remote`
  and the selected version is applied to the integrated terminals.

### Changed

- Rebalanced the logo wordmark to uppercase `NVM` for a more even look.

### Removed

- The redundant status bar toggle and the `nvmManager.statusBar.enabled` setting; use the status bar
  context menu to show or hide the item.

## [0.0.1] - 2026-09-24

### Added

- Versions view in the activity bar: installed versions with the active one marked,
  and an Available list (`nvm list available`) you can install from.
- Switch the active version from the tree, the status bar, or the command palette.
- Auto-switch per project from `.nvmrc`, `.node-version` or `package.json`
  `engines.node`, with global and per-workspace toggles.
- Sidebar Settings panel: auto-switch global/project, ask-when-off, status bar.
- Install, uninstall and copy a version from the context menu.
