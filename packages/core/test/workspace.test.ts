import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ERROR_CODES, resolveWorkspacePath, toSprigcodeError } from "../src/index.js";

describe("workspace path resolution", () => {
  it("refuses paths that resolve outside the workspace through a symlink", async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), "sprigcode-workspace-"));
    const outside = await mkdtemp(path.join(os.tmpdir(), "sprigcode-outside-"));
    await mkdir(path.join(outside, "src"), { recursive: true });
    await writeFile(path.join(outside, "src", "outside.ts"), "export const outside = true;\n", "utf8");

    await symlink(outside, path.join(workspace, "linked"), process.platform === "win32" ? "junction" : "dir");

    try {
      resolveWorkspacePath(workspace, "linked/src/outside.ts");
      throw new Error("Expected symlink escape to be refused.");
    } catch (error) {
      expect(toSprigcodeError(error).code).toBe(ERROR_CODES.WORKSPACE_PATH_ESCAPE);
    }
  });
});
