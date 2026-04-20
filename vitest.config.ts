import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

function fromRoot(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url));
}

export default defineConfig({
  resolve: {
    alias: {
      "@sprigcode/core": fromRoot("./packages/core/src/index.ts"),
      "@sprigcode/schema": fromRoot("./packages/schema/src/index.ts"),
      "@sprigcode/testkit": fromRoot("./packages/testkit/src/index.ts"),
      "@sprigcode/ts": fromRoot("./packages/ts/src/index.ts"),
      "@sprigcode/cli": fromRoot("./packages/cli/src/index.ts")
    }
  },
  test: {
    passWithNoTests: false,
    testTimeout: 20000
  }
});
