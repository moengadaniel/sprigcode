import { writeFile } from "node:fs/promises";
import path from "node:path";

const template = {
  version: "0.1",
  language: "typescript",
  description: "Add an import with Sprigcode.",
  ops: [
    {
      id: "add-example-import",
      op: "add_import",
      file: "src/index.ts",
      from: "./dep",
      named: ["thing"]
    }
  ],
  constraints: []
};

export async function initCommand(targetPath = "transaction.sprigcode.json"): Promise<string> {
  const absolute = path.resolve(targetPath);
  await writeFile(absolute, `${JSON.stringify(template, null, 2)}\n`, "utf8");
  return absolute;
}

