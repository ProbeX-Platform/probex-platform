# @probex-platform/configs

Shared tooling configs for ProbeX and other TS/Node projects.

| Export                                             | Tool       | Usage                                                                                       |
| -------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------- |
| `@probex-platform/configs/tsconfig/base.json`      | TypeScript | `"extends": "@probex-platform/configs/tsconfig/base.json"`                                  |
| `@probex-platform/configs/tsconfig/workspace.json` | TypeScript | a monorepo package: `src/` → `dist/`, composite, tests and type tests left out of the build |
| `@probex-platform/configs/eslint`                  | ESLint     | `export default [...config, { /* overrides */ }]`                                           |
| `@probex-platform/configs/prettier`                | Prettier   | `export { default } from "@probex-platform/configs/prettier"`                               |
| `@probex-platform/configs/vitest`                  | Vitest     | `export default createVitestConfig()`, `mergeConfig` it for overrides                       |

ESLint plugins are bundled as dependencies. `eslint`, `prettier`, `typescript` and `vitest` are optional peer
dependencies — install only the tools you use.

To run tests against workspace sources without a build, export a source condition from each package, for example
`"@acme/source": "./src/index.ts"`, and build the Vitest config with it:

```ts
import { createVitestConfig } from "@probex-platform/configs/vitest";

export default createVitestConfig({ sourceCondition: "@acme/source" });
```

Full reference: [docs/api/configs.md](https://github.com/ProbeX-Platform/probex-platform/blob/main/docs/api/configs.md).
