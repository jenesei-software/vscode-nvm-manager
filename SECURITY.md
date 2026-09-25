# Security policy

## Scope

NVM Manager is a local VS Code extension for nvm-windows and nvm-sh (macOS / Linux). It runs `nvm`
with version strings, reads project files (`.nvmrc`, `.node-version`, `package.json`) from the open
workspace, and writes VS Code settings. It has no server component, no telemetry and no network
communication of its own — `nvm install` / `nvm list available` reach the network through `nvm`
itself.

Values taken from project files are validated before they reach `nvm`: version strings must match a
strict allowlist, arguments passed to a shell are quoted, and the package manager probe only runs
known binaries. Reports that bypass these checks are especially welcome.

## Reporting a vulnerability

Please report security issues privately instead of opening a public issue:

1. On GitHub: **Security** tab → **Report a vulnerability** (private disclosure).
2. If that is not possible, open a minimal public issue asking for a private contact channel —
   without any details of the vulnerability.

Please include:

- the NVM Manager version,
- your VS Code version and operating system,
- what happens and how to reproduce it,
- the potential impact — what an attacker could achieve.

## What to expect

This is a hobby project maintained in free time, so responses are best effort — usually within a
few days. Confirmed issues are fixed in a release as soon as possible, and the fix is mentioned in
the release notes.
