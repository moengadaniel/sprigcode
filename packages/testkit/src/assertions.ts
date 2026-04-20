import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { expect } from "vitest";

function normalizeFileText(value: string): string {
  return value.replaceAll("\r\n", "\n").replace(/\n+$/u, "\n");
}

async function collectFiles(root: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if ((await stat(fullPath)).isFile()) {
        files.push(path.relative(root, fullPath).replaceAll("\\", "/"));
      }
    }
  }

  await walk(root);
  return files.sort();
}

export async function expectDirectoriesToMatch(actualRoot: string, expectedRoot: string): Promise<void> {
  const actualFiles = await collectFiles(actualRoot);
  const expectedFiles = await collectFiles(expectedRoot);
  expect(actualFiles).toEqual(expectedFiles);

  for (const file of actualFiles) {
    const [actual, expected] = await Promise.all([
      readFile(path.join(actualRoot, file), "utf8"),
      readFile(path.join(expectedRoot, file), "utf8")
    ]);
    expect(normalizeFileText(actual)).toBe(normalizeFileText(expected));
  }
}
