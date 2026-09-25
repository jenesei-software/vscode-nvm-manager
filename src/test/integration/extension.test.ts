import * as assert from "node:assert";
import * as vscode from "vscode";

const EXTENSION_ID = "jenesei-software.nvm-manager";

suite("NVM Manager extension", () => {
  test("is present and activates", async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `extension ${EXTENSION_ID} should be installed`);
    await extension.activate();
    assert.ok(extension.isActive, "extension should be active");
  });

  test("registers its commands", async () => {
    await vscode.extensions.getExtension(EXTENSION_ID)?.activate();
    const commands = await vscode.commands.getCommands(true);
    for (const id of [
      "nvmManager.refresh",
      "nvmManager.switch",
      "nvmManager.pinVersion",
      "nvmManager.installDeclared",
      "nvmManager.switchToDeclared",
    ]) {
      assert.ok(commands.includes(id), `${id} should be registered`);
    }
  });

  test("refresh resolves against the nvm stub", async () => {
    await vscode.extensions.getExtension(EXTENSION_ID)?.activate();
    await vscode.commands.executeCommand("nvmManager.refresh");
  });
});
