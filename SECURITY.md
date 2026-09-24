# Security policy

## Scope

NVM Manager is a local VS Code extension for nvm-windows. It runs `nvm.exe` with user-supplied
version strings, reads project files (`.nvmrc`, `.node-version`, `package.json`) from the open
workspace, and writes VS Code settings. It has no server component, no telemetry and no network
communication of its own — `nvm install` / `nvm list available` reach the network through
`nvm.exe` itself.

## Reporting a vulnerability

Please report security issues privately instead of opening a public issue:

1. On GitHub: **Security** tab → **Report a vulnerability** (private disclosure).
2. If that is not possible, open a minimal public issue asking for a private contact channel —
   without any details of the vulnerability.

Please include:

- the NVM Manager version,
- your VS Code version and Windows version,
- what happens and how to reproduce it,
- the potential impact — what an attacker could achieve.

## What to expect

This is a hobby project maintained in free time, so responses are best effort — usually within a
few days. Confirmed issues are fixed in a release as soon as possible, and the fix is mentioned in
the release notes.
