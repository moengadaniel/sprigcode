import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect } from "vitest";
import {
  type SprigcodeErrorCode,
  type TransactionDocument,
  createTransaction,
  toSprigcodeError,
  validateTransactionDocument
} from "../../core/src/index.js";
import { typescriptAdapter } from "../src/index.js";

const DEFAULT_TSCONFIG = {
  compilerOptions: {
    target: "ES2022",
    module: "NodeNext",
    moduleResolution: "NodeNext",
    strict: true,
    skipLibCheck: true
  },
  include: ["src/**/*.ts", "src/**/*.tsx"]
};

export async function createTsWorkspace(
  files: Record<string, string>,
  options?: {
    includeTsconfig?: boolean;
  }
): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "sprigcode-ts-hardening-"));

  if (options?.includeTsconfig !== false) {
    await writeWorkspaceFile(root, "tsconfig.json", `${JSON.stringify(DEFAULT_TSCONFIG, null, 2)}\n`);
  }

  for (const [filePath, contents] of Object.entries(files)) {
    await writeWorkspaceFile(root, filePath, contents);
  }

  return root;
}

export async function writeWorkspaceFile(
  workspace: string,
  relativePath: string,
  contents: string
): Promise<void> {
  const absolute = path.join(workspace, relativePath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, contents, "utf8");
}

export async function createTsTransaction(document: TransactionDocument, workspace: string) {
  return createTransaction({
    document: validateTransactionDocument(document),
    workspace,
    adapters: [typescriptAdapter()]
  });
}

export async function expectSprigcodeFailure(
  action: () => Promise<unknown>,
  code: SprigcodeErrorCode | string
): Promise<void> {
  try {
    await action();
  } catch (error) {
    expect(toSprigcodeError(error).code).toBe(code);
    return;
  }

  throw new Error(`Expected action to fail with ${code}.`);
}

