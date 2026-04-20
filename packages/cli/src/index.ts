#!/usr/bin/env node
import { formatFailure, formatFailureWithContext, formatSuccess, formatValidationSuccess } from "./output.js";
import { applyCommand } from "./commands/apply.js";
import { checkCommand } from "./commands/check.js";
import { explainCommand } from "./commands/explain.js";
import { initCommand } from "./commands/init.js";
import { validateCommand } from "./commands/validate.js";

type ParsedArgs = {
  command?: string;
  transactionPath?: string;
  workspace?: string;
  json: boolean;
  dryRun: boolean;
  errorPath?: string;
};

function parseArgs(argv: string[]): ParsedArgs {
  const args = [...argv];
  const command = args.shift();
  const parsed: ParsedArgs = { command, json: false, dryRun: false };

  while (args.length > 0) {
    const value = args.shift();
    if (!value) {
      continue;
    }

    if (value === "--json") {
      parsed.json = true;
      continue;
    }

    if (value === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }

    if (value === "--workspace") {
      parsed.workspace = args.shift();
      continue;
    }

    if (!parsed.transactionPath) {
      parsed.transactionPath = value;
      continue;
    }

    parsed.errorPath = value;
  }

  return parsed;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const helpText = [
    "Sprigcode CLI",
    "Commands:",
    "  sprigcode init",
    "  sprigcode validate transaction.sprigcode.json",
    "  sprigcode check transaction.sprigcode.json --workspace .",
    "  sprigcode apply transaction.sprigcode.json --workspace . [--dry-run] [--json]",
    "  sprigcode explain error.json"
  ].join("\n");

  if (args.command === "--help" || args.command === "-h" || args.command === "help") {
    process.stdout.write(`${helpText}\n`);
    process.exitCode = 0;
    return;
  }

  switch (args.command) {
    case "validate": {
      const result = await validateCommand(args.transactionPath ?? "transaction.sprigcode.json");
      const output = result.ok
        ? formatValidationSuccess(
            result.output as {
              status: "validated";
              language: string;
              operationCount: number;
            },
            args.json
          )
        : formatFailure("validate", result.output as never, args.json);
      process.stdout.write(`${output}\n`);
      process.exitCode = result.ok ? 0 : 1;
      return;
    }
    case "apply": {
      const result = await applyCommand({
        transactionPath: args.transactionPath ?? "transaction.sprigcode.json",
        workspace: args.workspace ?? process.cwd(),
        dryRun: args.dryRun
      });
      if (result.ok) {
        process.stdout.write(`${formatSuccess("apply", result.result, args.json)}\n`);
        process.exitCode = 0;
      } else {
        process.stderr.write(
          `${formatFailureWithContext("apply", result.error, result.transaction, args.json)}\n`
        );
        process.exitCode = 1;
      }
      return;
    }
    case "check": {
      const result = await checkCommand(
        args.transactionPath ?? "transaction.sprigcode.json",
        args.workspace ?? process.cwd()
      );
      if (result.ok) {
        process.stdout.write(`${formatSuccess("check", result.result, args.json)}\n`);
        process.exitCode = 0;
      } else {
        process.stderr.write(
          `${formatFailureWithContext("check", result.error, result.transaction, args.json)}\n`
        );
        process.exitCode = 1;
      }
      return;
    }
    case "explain": {
      process.stdout.write(`${await explainCommand(args.transactionPath ?? "error.json")}\n`);
      process.exitCode = 0;
      return;
    }
    case "init": {
      const output = await initCommand(args.transactionPath);
      process.stdout.write(`Created ${output}\n`);
      process.exitCode = 0;
      return;
    }
    default:
      process.stdout.write(helpText);
      process.exitCode = 1;
  }
}

void main();
