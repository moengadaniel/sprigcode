import { describe, expect, it } from "vitest";
import { createUnifiedDiff } from "../src/diff.js";

describe("createUnifiedDiff", () => {
  it("produces line-oriented output", () => {
    const diff = createUnifiedDiff("src/index.ts", "const a = 1;\n", "const a = 2;\n");
    expect(diff.diff).toContain("-const a = 1;");
    expect(diff.diff).toContain("+const a = 2;");
  });
});
