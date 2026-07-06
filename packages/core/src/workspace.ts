import { cp, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { ERROR_CODES, sprigcodeError } from "./errors.js";

export async function readWorkspaceFile(workspaceRoot: string, relativePath: string): Promise<string> {
  return readFile(resolveWorkspacePath(workspaceRoot, relativePath), "utf8");
}

export async function writeWorkspaceFile(
  workspaceRoot: string,
  relativePath: string,
  contents: string
): Promise<void> {
  await writeFile(resolveWorkspacePath(workspaceRoot, relativePath), contents, "utf8");
}

export function resolveWorkspacePath(workspaceRoot: string, relativePath: string): string {
  const resolved = path.resolve(workspaceRoot, relativePath);
  const root = path.resolve(workspaceRoot);
  assertInsideWorkspace(root, resolved, workspaceRoot, relativePath);
  assertInsideWorkspace(realpathSync.native(root), realPathForBoundaryCheck(resolved), workspaceRoot, relativePath);

  return resolved;
}

function assertInsideWorkspace(
  root: string,
  resolved: string,
  workspaceRoot: string,
  relativePath: string
): void {
  const relative = path.relative(root, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw sprigcodeError(
      ERROR_CODES.WORKSPACE_PATH_ESCAPE,
      `Path ${relativePath} escapes the workspace.`,
      { workspaceRoot, relativePath }
    );
  }
}

function realPathForBoundaryCheck(resolvedPath: string): string {
  if (existsSync(resolvedPath)) {
    return realpathSync.native(resolvedPath);
  }

  let ancestor = path.dirname(resolvedPath);
  while (!existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) {
      return resolvedPath;
    }
    ancestor = parent;
  }

  return path.resolve(realpathSync.native(ancestor), path.relative(ancestor, resolvedPath));
}

export async function copyWorkspaceToTemp(workspaceRoot: string): Promise<string> {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "sprigcode-"));
  await cp(workspaceRoot, tempRoot, { recursive: true });
  return tempRoot;
}

export async function removeTempWorkspace(workspaceRoot: string): Promise<void> {
  await rm(workspaceRoot, { recursive: true, force: true });
}

export async function listWorkspaceSourceFiles(workspaceRoot: string): Promise<string[]> {
  const result: string[] = [];

  async function walk(currentPath: string): Promise<void> {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name.startsWith(".")) {
        continue;
      }

      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (!/\.(ts|tsx)$/.test(entry.name)) {
        continue;
      }

      result.push(path.relative(workspaceRoot, fullPath).replaceAll("\\", "/"));
    }
  }

  await walk(workspaceRoot);
  return result.sort();
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const value = await stat(filePath);
    return value.isFile();
  } catch {
    return false;
  }
}
