import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SprigcodeError } from "@sprigcode/core";

export async function explainCommand(errorPath: string): Promise<string> {
  const error = JSON.parse(await readFile(path.resolve(errorPath), "utf8")) as SprigcodeError;
  const details = error.details ? `\nDetails: ${JSON.stringify(error.details, null, 2)}` : "";
  return `${error.code}: ${error.message}${details}`;
}
