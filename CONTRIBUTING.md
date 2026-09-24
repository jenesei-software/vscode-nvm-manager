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
npm run check        # lint + typecheck + registry guard
npm test

# Develop inside VS Code
npm run build:watch
# then press F5 for an Extension Development Host
```

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
- Prefer conventional commit prefixes: `feat:`, `fix:`, `docs:`, `chore:`.
- Run `npm run check` and `npm test` before opening a pull request and keep them green.
- Keep pull requests focused: one feature or fix per PR where possible.

## Releasing

Maintainer notes. The version lives in `package.json` and follows
[Semantic Versioning](https://semver.org/); every release is tagged `vX.Y.Z` and listed in
[CHANGELOG.md](CHANGELOG.md).

Releases are automated by the [release workflow](.github/workflows/release.yml)
(Actions → **Release** → *Run workflow*, pick `patch` / `minor` / `major`). It verifies the
build, bumps the version, commits, tags, builds the `.vsix`, publishes to the
[Visual Studio Marketplace](https://marketplace.visualstudio.com/) and creates a GitHub release.

One-time setup:

1. **Publisher** — create it at <https://marketplace.visualstudio.com/manage>. The id must match
   `publisher` in `package.json` (`jenesei-software`).
2. **PAT** — in Azure DevOps create a Personal Access Token with the **Marketplace → Manage**
   scope (organization *All accessible organizations*).
3. **Secret** — add it to the repository as the `VSCE_PAT` secret
   (Settings → Secrets and variables → Actions). Without it the workflow still tags and builds
   the `.vsix`, but skips the Marketplace publish.

For a local publish, set `VSCE_PAT` in the environment and run:

```powershell
npm run vsix:publish
```

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
