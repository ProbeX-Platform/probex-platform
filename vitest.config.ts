import { defineConfig } from "vitest/config";

// Root config holds only global options; per-project options come from each workspace's `vitest.config.ts`
export default defineConfig({
  test: {
    projects: ["packages/*/vitest.config.ts", "examples/*/vitest.config.ts"],
  },
});
