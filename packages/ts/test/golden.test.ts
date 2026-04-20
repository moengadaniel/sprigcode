import path from "node:path";
import { describe, it } from "vitest";
import { runGoldenCase } from "../../testkit/src/index.js";
import { typescriptAdapter } from "../src/index.js";

const root = path.resolve(import.meta.dirname, "..", "..", "..", "examples");

describe("golden cases", () => {
  it("add-import", async () => {
    await runGoldenCase(path.join(root, "add-import"), [typescriptAdapter()]);
  });

  it("rename-symbol", async () => {
    await runGoldenCase(path.join(root, "rename-symbol"), [typescriptAdapter()]);
  });

  it("add-required-parameter", async () => {
    await runGoldenCase(path.join(root, "add-required-parameter"), [typescriptAdapter()]);
  });

  it("extend-object-literal", async () => {
    await runGoldenCase(path.join(root, "extend-object-literal"), [typescriptAdapter()]);
  });

  it("insert-before-call", async () => {
    await runGoldenCase(path.join(root, "insert-before-call"), [typescriptAdapter()]);
  });

  it("password-reset-rate-limit", async () => {
    await runGoldenCase(path.join(root, "password-reset-rate-limit"), [typescriptAdapter()]);
  });

  it("password-reset-hardening", async () => {
    await runGoldenCase(path.join(root, "password-reset-hardening"), [typescriptAdapter()]);
  });
});
