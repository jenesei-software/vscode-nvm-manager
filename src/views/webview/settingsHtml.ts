import * as vscode from "vscode";

function createNonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let index = 0; index < 32; index++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

export function getSettingsHtml(_webview: vscode.Webview): string {
  const nonce = createNonce();
  const csp = [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    `script-src 'nonce-${nonce}'`,
  ].join("; ");

  const labels = {
    inherited: vscode.l10n.t("Inherited from the global setting."),
    overridden: vscode.l10n.t(
      "Overrides the global setting for this workspace.",
    ),
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>NVM Manager</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 12px;
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: transparent;
  }
  .hidden { display: none !important; }
  .card {
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 8px;
    background: var(--vscode-sideBar-background);
    overflow: hidden;
    margin-bottom: 12px;
  }
  .active-card {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px;
    text-align: left;
    color: inherit;
  }
  .active-card:hover { background: var(--vscode-list-hoverBackground); }
  .active-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .active-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.7; }
  .active-value {
    font-size: 18px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .active-hint {
    flex: none;
    color: var(--vscode-textLink-foreground);
    font-size: 12px;
    white-space: nowrap;
  }
  button {
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
    border-radius: 4px;
    border: 1px solid var(--vscode-button-border, transparent);
  }
  .group-title {
    padding: 10px 12px 6px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.7;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 12px;
    cursor: pointer;
  }
  .row:hover { background: var(--vscode-list-hoverBackground); }
  .row-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .row-label { font-weight: 500; }
  .row-desc { font-size: 11px; opacity: 0.7; line-height: 1.35; }
  .link {
    display: block;
    margin: 2px 12px 8px;
    padding: 0;
    border: none;
    background: none;
    color: var(--vscode-textLink-foreground);
    font-size: 11px;
    text-align: left;
  }
  .link:hover { color: var(--vscode-textLink-activeForeground); text-decoration: underline; }
  .switch { position: relative; display: inline-block; width: 34px; height: 18px; flex: none; }
  .switch input { position: absolute; opacity: 0; width: 0; height: 0; }
  .slider {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: var(--vscode-checkbox-background, var(--vscode-input-background));
    border: 1px solid var(--vscode-checkbox-border, var(--vscode-input-border));
    transition: background 0.12s ease;
  }
  .slider::before {
    content: "";
    position: absolute;
    width: 12px;
    height: 12px;
    left: 3px;
    top: 2px;
    border-radius: 50%;
    background: var(--vscode-foreground);
    transition: transform 0.12s ease;
  }
  .switch input:checked + .slider {
    background: var(--vscode-button-background);
    border-color: var(--vscode-button-background);
  }
  .switch input:checked + .slider::before {
    transform: translateX(16px);
    background: var(--vscode-button-foreground);
  }
  .switch input:focus-visible + .slider {
    outline: 2px solid var(--vscode-focusBorder);
    outline-offset: 1px;
  }
  .switch input:disabled + .slider { opacity: 0.5; }
  .divider { height: 1px; background: var(--vscode-widget-border, var(--vscode-panel-border)); }
  .active-card:focus-visible,
  .link:focus-visible,
  .button:focus-visible {
    outline: 2px solid var(--vscode-focusBorder);
    outline-offset: 1px;
  }
  .button {
    display: block;
    width: calc(100% - 24px);
    margin: 8px 12px 12px;
    padding: 7px 10px;
    color: var(--vscode-button-foreground);
    background: var(--vscode-button-background);
  }
  .button:hover { background: var(--vscode-button-hoverBackground); }
  .meta { padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
  .meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.7; }
  .meta-value { font-family: var(--vscode-editor-font-family); font-size: 12px; word-break: break-all; }
  @media (prefers-reduced-motion: reduce) {
    .slider, .slider::before { transition: none; }
  }
</style>
</head>
<body>
  <button class="card active-card" id="switch" type="button">
    <span class="active-meta">
      <span class="active-label">${vscode.l10n.t("Active version")}</span>
      <span class="active-value" id="active" aria-live="polite">-</span>
    </span>
    <span class="active-hint">${vscode.l10n.t("Switch")}</span>
  </button>

  <div class="card">
    <div class="group-title">${vscode.l10n.t("Auto-switch")}</div>
    <label class="row" for="toggle-autoSwitchGlobal">
      <span class="row-text">
        <span class="row-label">${vscode.l10n.t("Global")}</span>
        <span class="row-desc">${vscode.l10n.t("Apply the version from .nvmrc automatically.")}</span>
      </span>
      <span class="switch">
        <input type="checkbox" id="toggle-autoSwitchGlobal" data-key="autoSwitchGlobal" />
        <span class="slider"></span>
      </span>
    </label>
    <div class="divider"></div>
    <label class="row" id="workspace-row" for="toggle-autoSwitchWorkspace">
      <span class="row-text">
        <span class="row-label">${vscode.l10n.t("This project")}</span>
        <span class="row-desc" id="workspace-desc">${vscode.l10n.t("Inherited from the global setting.")}</span>
      </span>
      <span class="switch">
        <input type="checkbox" id="toggle-autoSwitchWorkspace" data-key="autoSwitchWorkspace" />
        <span class="slider"></span>
      </span>
    </label>
    <button class="link hidden" id="reset-workspace">${vscode.l10n.t("Reset project setting to global")}</button>
    <div class="divider"></div>
    <label class="row" for="toggle-askWhenOff">
      <span class="row-text">
        <span class="row-label">${vscode.l10n.t("Ask when off")}</span>
        <span class="row-desc">${vscode.l10n.t("Prompt before switching when auto-switch is disabled.")}</span>
      </span>
      <span class="switch">
        <input type="checkbox" id="toggle-askWhenOff" data-key="askWhenOff" />
        <span class="slider"></span>
      </span>
    </label>
  </div>

  <div class="card">
    <div class="group-title">${vscode.l10n.t("Runtime")}</div>
    <div class="meta">
      <span class="meta-label">${vscode.l10n.t("nvm location")}</span>
      <span class="meta-value" id="nvm-location">-</span>
    </div>
    <div class="divider"></div>
    <button class="link" id="doctor" type="button">${vscode.l10n.t("Run diagnostics")}</button>
  </div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const labels = ${JSON.stringify(labels)};
  const toggles = document.querySelectorAll("input[data-key]");

  function setChecked(key, value) {
    for (const toggle of toggles) {
      if (toggle.dataset.key === key) {
        toggle.checked = Boolean(value);
      }
    }
  }

  function render(state) {
    document.getElementById("active").textContent = state.activeVersion
      ? "v" + state.activeVersion
      : "none";
    document.getElementById("nvm-location").textContent =
      state.nvmLocation || "unknown";
    setChecked("autoSwitchGlobal", state.autoSwitchGlobal);
    setChecked(
      "autoSwitchWorkspace",
      state.autoSwitchWorkspace === undefined
        ? state.autoSwitchGlobal
        : state.autoSwitchWorkspace
    );
    setChecked("askWhenOff", state.askWhenOff);

    const workspaceRow = document.getElementById("workspace-row");
    const resetButton = document.getElementById("reset-workspace");
    const workspaceDesc = document.getElementById("workspace-desc");
    const overridden = state.autoSwitchWorkspace !== undefined;

    if (!state.hasWorkspace) {
      workspaceRow.classList.add("hidden");
      resetButton.classList.add("hidden");
    } else {
      workspaceRow.classList.remove("hidden");
      resetButton.classList.toggle("hidden", !overridden);
      workspaceDesc.textContent = overridden
        ? labels.overridden
        : labels.inherited;
    }
  }

  for (const toggle of toggles) {
    toggle.addEventListener("change", () => {
      vscode.postMessage({
        type: "update",
        key: toggle.dataset.key,
        value: toggle.checked,
      });
    });
  }

  document.getElementById("switch").addEventListener("click", () => {
    vscode.postMessage({ type: "switch" });
  });
  document.getElementById("reset-workspace").addEventListener("click", () => {
    vscode.postMessage({ type: "resetWorkspace" });
  });
  document.getElementById("doctor").addEventListener("click", () => {
    vscode.postMessage({ type: "doctor" });
  });
  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "state") {
      render(event.data.state);
    }
  });
  vscode.postMessage({ type: "ready" });
</script>
</body>
</html>`;
}
