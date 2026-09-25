# Contributing to NVM Manager

Thanks for wanting to help! NVM Manager is a small hobby project, and every issue and pull request
matters.

## Ways to contribute

- **Report a bug** — use the [bug report template](https://github.com/jenesei-software/vscode-nvm-manager/issues/new/choose).
- **Request a feature** — the feature template; the more context, the better.
- **Send a pull request** — fixes, adapters, UI polish, docs.

## Development setup

Requirements: Node.js 22+, npm, and nvm for manual testing — `nvm-windows` on Windows,
`nvm-sh` on macOS/Linux.

```powershell
npm install
npm run build         # dev bundle to dist/ (with source maps)
npm run build:watch   # rebuild on change
npm run build:prod    # minified production bundle
npm run lint          # biome check (lint + format + imports)
npm run lint:fix      # biome check, apply safe fixes
npm run format        # biome format --write
npm run typecheck     # tsc --noEmit
npm run check         # lint + typecheck + registry guard
npm test              # unit tests
npm run vsix          # package the .vsix
```

### Run the extension locally

1. `npm install`, then `npm run build`.
2. Open this folder in VS Code and press `F5` (Run and Debug → **Run Extension**). A second window
   opens with the extension loaded — open the **NVM Manager** icon in the activity bar there. Use
   `npm run build:watch` to rebuild on every change.
3. To try it in your normal editor without the debug host:

   ```powershell
   npm run vsix
   code --install-extension nvm-manager-<version>.vsix
   ```

   The version in the file name comes from `package.json`.

Notes:

- Formatting and linting go through [Biome](https://biomejs.dev) (`npm run format`, `npm run lint`).
  Install the recommended `biomejs.biome` extension — VS Code is configured to format on save.
- The extension shells out to nvm (`nvm.exe` on Windows, `nvm` via bash on macOS/Linux);
  on Windows `nvm use` may require administrator rights to recreate the `NVM_SYMLINK` symlink.
- On macOS/Linux `nvm use` only affects its own shell, so the selection is applied to the
  integrated terminal environment (`src/services/terminalEnv.ts`).
- `npm test` covers the version resolver and the nvm output parsers.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/extension.ts` | Activation and wiring |
| `src/nvm/` | nvm adapters: detection, `nvm-windows` and `nvm-sh` implementations |
| `src/services/` | Version cache, auto-switch and terminal environment |
| `src/views/` | The Versions tree and the Settings webview panel |
| `src/util/` | Process execution, version resolution and output parsing |
| `src/test/` | Unit tests |

## Code guidelines

- Keep comments in English; user-facing strings are in English too.
- Wrap user-facing strings in `vscode.l10n.t(...)` and add the translations under `l10n/` and
  `package.nls.<locale>.json` (`npm run l10n:extract` regenerates the default bundle).
- Prefer conventional commit prefixes: `feat:`, `fix:`, `docs:`, `chore:`.
- Run `npm run check` and `npm test` before opening a pull request and keep them green.
- Keep pull requests focused: one feature or fix per PR where possible.

## Changelog

Notable changes are tracked in [CHANGELOG.md](CHANGELOG.md) following
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Add a bullet under `## [Unreleased]`
(Added / Changed / Fixed / Removed / Deprecated / Security) as part of your change.

Maintainers: the release steps live in [docs/RELEASING.md](docs/RELEASING.md).

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
