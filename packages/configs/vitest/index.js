import { configDefaults, defineProject } from "vitest/config";

// Workspace packages export `@probex/source` → `src/index.ts`, so tests run against sources without a build.
// Setting conditions replaces Vite's defaults, hence the defaults are listed too.
const conditions = ["@probex/source", "module", "node", "development|production"];

// Per-project config: each workspace re-exports (or merges) it in its own `vitest.config.ts`
export default defineProject({
  resolve: { conditions },
  ssr: { resolve: { conditions } },
  test: {
    include: ["**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/dist/**"],
  },
});
