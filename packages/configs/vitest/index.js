import { configDefaults, defineProject } from "vitest/config";

// Per-project config: each workspace re-exports (or merges) it in its own `vitest.config.ts`
export default defineProject({
  test: {
    include: ["**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/dist/**"],
  },
});
