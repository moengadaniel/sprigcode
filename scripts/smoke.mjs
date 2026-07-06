import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const cliEntry = path.join(root, "packages", "cli", "dist", "index.js");

function runNode(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      ...options
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function normalizeDirectoryFiles(rootDir) {
  const files = [];

  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      files.push(path.relative(rootDir, fullPath).replaceAll("\\", "/"));
    }
  }

  await walk(rootDir);
  files.sort();

  const normalized = new Map();
  for (const file of files) {
    const contents = await readFile(path.join(rootDir, file), "utf8");
    normalized.set(file, contents.replaceAll("\r\n", "\n").replace(/\n+$/u, "\n"));
  }

  return normalized;
}

async function assertDirectoriesMatch(actualRoot, expectedRoot) {
  const [actual, expected] = await Promise.all([
    normalizeDirectoryFiles(actualRoot),
    normalizeDirectoryFiles(expectedRoot)
  ]);

  const actualFiles = [...actual.keys()];
  const expectedFiles = [...expected.keys()];
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error(`Smoke mismatch in file sets.\nActual: ${actualFiles.join(", ")}\nExpected: ${expectedFiles.join(", ")}`);
  }

  for (const file of actualFiles) {
    if (actual.get(file) !== expected.get(file)) {
      throw new Error(`Smoke mismatch for ${file}.`);
    }
  }
}

async function runSuccessExample(exampleName, label) {
  const exampleRoot = path.join(root, "examples", exampleName);
  const workspace = await mkdtemp(path.join(os.tmpdir(), `sprigcode-smoke-${exampleName}-`));
  await cp(path.join(exampleRoot, "before"), workspace, { recursive: true });

  try {
    const apply = await runNode([
      cliEntry,
      "apply",
      path.join(exampleRoot, "transaction.sprigcode.json"),
      "--workspace",
      workspace,
      "--json"
    ]);

    if (apply.code !== 0) {
      throw new Error(`${label} smoke demo failed.\n${apply.stdout}\n${apply.stderr}`);
    }

    const payload = JSON.parse(apply.stdout);
    if (!payload.ok || payload.transaction.status !== "verified") {
      throw new Error(`Unexpected ${label} demo JSON output.\n${apply.stdout}`);
    }

    await assertDirectoriesMatch(workspace, path.join(exampleRoot, "after"));
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

async function main() {
  if (!existsSync(cliEntry)) {
    throw new Error(`CLI build output not found at ${cliEntry}. Run the build before smoke tests.`);
  }

  await runSuccessExample("password-reset-rate-limit", "Password reset demo");
  await runSuccessExample("nextjs-guarded-route", "Next.js guarded route");

  const failureExample = path.join(root, "examples", "ambiguous-anchor-failure");
  const failureWorkspace = await mkdtemp(path.join(os.tmpdir(), "sprigcode-smoke-failure-"));
  await cp(path.join(failureExample, "before"), failureWorkspace, { recursive: true });

  try {
    const failure = await runNode([
      cliEntry,
      "apply",
      path.join(failureExample, "transaction.sprigcode.json"),
      "--workspace",
      failureWorkspace,
      "--json"
    ]);

    if (failure.code === 0) {
      throw new Error(`Ambiguous-anchor smoke demo unexpectedly succeeded.\n${failure.stdout}`);
    }

    const failurePayload = JSON.parse(failure.stderr);
    if (failurePayload?.error?.code !== "ANCHOR_NOT_UNIQUE") {
      throw new Error(`Unexpected ambiguous-anchor failure output.\n${failure.stderr}`);
    }
  } finally {
    await rm(failureWorkspace, { recursive: true, force: true });
  }
}

await main();
