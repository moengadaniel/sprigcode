import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const publicPackages = ["schema", "core", "ts", "testkit", "cli"];
const npmExecPath = process.env.npm_execpath;
const releaseVersion = JSON.parse(await readFile(path.join(root, "packages", "core", "package.json"), "utf8")).version;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
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

function runNpm(args, options = {}) {
  if (npmExecPath) {
    return run(process.execPath, [npmExecPath, ...args], options);
  }

  return run("npm", args, options);
}

function assert(condition, message, context) {
  if (!condition) {
    const details = context ? `\n${context}` : "";
    throw new Error(`${message}${details}`);
  }
}

function getCliBinPath(consumerRoot) {
  return process.platform === "win32"
    ? path.join(consumerRoot, "node_modules", ".bin", "sprigcode.cmd")
    : path.join(consumerRoot, "node_modules", ".bin", "sprigcode");
}

function getCliEntryPath(consumerRoot) {
  return path.join(consumerRoot, "node_modules", "@sprigcode", "cli", "dist", "index.js");
}

function runInstalledCli(consumerRoot, args) {
  if (process.platform === "win32") {
    return run(process.execPath, [getCliEntryPath(consumerRoot), ...args], { cwd: consumerRoot });
  }

  return run(getCliBinPath(consumerRoot), args, { cwd: consumerRoot });
}

async function main() {
  const packDir = await mkdtemp(path.join(os.tmpdir(), "sprigcode-pack-"));
  const consumerRoot = await mkdtemp(path.join(os.tmpdir(), "sprigcode-consumer-"));

  try {
    for (const name of publicPackages) {
      const workspace = `@sprigcode/${name}`;
      const pack = await runNpm(["pack", "--workspace", workspace, "--pack-destination", packDir], {
        cwd: root
      });
      assert(pack.code === 0, `Packing ${workspace} failed.`, `${pack.stdout}\n${pack.stderr}`);
    }

    const tarballs = publicPackages.map((name) => path.join(packDir, `sprigcode-${name}-${releaseVersion}.tgz`));
    for (const tarball of tarballs) {
      assert(existsSync(tarball), `Expected tarball missing: ${tarball}`);
    }

    await writeFile(
      path.join(consumerRoot, "package.json"),
      JSON.stringify(
        {
          name: "sprigcode-consumer-smoke",
          private: true,
          type: "module",
          version: "0.0.0"
        },
        null,
        2
      ),
      "utf8"
    );

    const install = await runNpm(["install", ...tarballs], { cwd: consumerRoot });
    assert(install.code === 0, "Installing packed tarballs in a clean consumer failed.", `${install.stdout}\n${install.stderr}`);

    const importCheck = await run(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        [
          'import { createTransaction, validateTransactionDocument } from "@sprigcode/core";',
          'import { typescriptAdapter } from "@sprigcode/ts";',
          'import { sprigcodeSchema, validateTransactionShape } from "@sprigcode/schema";',
          'const doc = validateTransactionDocument({ version: "0.1", language: "typescript", ops: [] });',
          'const shape = validateTransactionShape(doc);',
          'if (!shape.valid) throw new Error("schema validation failed");',
          'if (sprigcodeSchema.$schema === undefined) throw new Error("schema export missing");',
          'if (typeof createTransaction !== "function") throw new Error("core export missing");',
          'if (typeof typescriptAdapter !== "function") throw new Error("ts export missing");',
          'console.log("imports-ok");'
        ].join(" ")
      ],
      { cwd: consumerRoot }
    );
    assert(importCheck.code === 0 && importCheck.stdout.includes("imports-ok"), "Consumer imports failed.", `${importCheck.stdout}\n${importCheck.stderr}`);

    const cliBin = getCliBinPath(consumerRoot);
    assert(existsSync(cliBin), "Installed sprigcode CLI binary not found.", cliBin);
    assert(existsSync(getCliEntryPath(consumerRoot)), "Installed sprigcode CLI entrypoint not found.", getCliEntryPath(consumerRoot));

    const help = await runInstalledCli(consumerRoot, ["--help"]);
    assert(help.code === 0, "sprigcode --help failed.", `${help.stdout}\n${help.stderr}`);
    assert(help.stdout.includes("Sprigcode CLI"), "sprigcode --help did not print CLI usage.", help.stdout);

    const transactionPath = path.join(consumerRoot, "transaction.sprigcode.json");
    await writeFile(
      transactionPath,
      JSON.stringify(
        {
          version: "0.1",
          language: "typescript",
          ops: [
            {
              id: "example",
              op: "add_import",
              file: "src/index.ts",
              from: "./dep",
              named: ["thing"]
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );

    await mkdir(path.join(consumerRoot, "src"), { recursive: true });
    await writeFile(path.join(consumerRoot, "src", "index.ts"), "export const value = 1;\n", "utf8");

    const validate = await runInstalledCli(consumerRoot, ["validate", "transaction.sprigcode.json"]);
    assert(validate.code === 0, "sprigcode validate failed in clean consumer project.", `${validate.stdout}\n${validate.stderr}`);
    assert(validate.stdout.includes("Transaction document is valid."), "Validate output did not confirm success.", validate.stdout);
  } finally {
    await rm(packDir, { recursive: true, force: true });
    await rm(consumerRoot, { recursive: true, force: true });
  }
}

await main();
