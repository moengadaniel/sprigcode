import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function createTempProject(sourceDir: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "sprigcode-golden-"));
  await cp(sourceDir, root, { recursive: true });
  return root;
}

export async function removeTempProject(projectRoot: string): Promise<void> {
  await rm(projectRoot, { recursive: true, force: true });
}

