# @probex/configs

Shared tooling configs for ProbeX and other TS/Node projects.

| Export                                    | Tool       | Usage                                                                    |
| ----------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| `@probex/configs/tsconfig/base.json`      | TypeScript | `"extends": "@probex/configs/tsconfig/base.json"`                        |
| `@probex/configs/tsconfig/workspace.json` | TypeScript | a monorepo package: `src/` → `dist/`, composite, `*.test.ts` not emitted |
| `@probex/configs/eslint`                  | ESLint     | `export default [...config, { /* overrides */ }]`                        |
| `@probex/configs/prettier`                | Prettier   | `export { default } from "@probex/configs/prettier"`                     |
| `@probex/configs/vitest`                  | Vitest     | `export default createVitestConfig()`, `mergeConfig` it for overrides    |

ESLint plugins are bundled as dependencies. `eslint`, `prettier`, `typescript` and `vitest` are optional peer
dependencies — install only the tools you use.

To run tests against workspace sources without a build, export a source condition (for example `"@acme/source":
"./src/index.ts"`) from each package and build the Vitest config with it:

```ts
import { createVitestConfig } from "@probex/configs/vitest";

export default createVitestConfig({ sourceCondition: "@acme/source" });
```

Full reference: [docs/api/configs.md](https://github.com/ProbeX-Platform/probex-platform/blob/main/docs/api/configs.md).
