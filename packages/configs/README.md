# @probex/configs

Shared tooling configs for ProbeX and other TS/Node projects.

| Export                               | Tool       | Usage                                                                         |
| ------------------------------------ | ---------- | ----------------------------------------------------------------------------- |
| `@probex/configs/tsconfig/base.json` | TypeScript | `"extends": "@probex/configs/tsconfig/base.json"`                             |
| `@probex/configs/eslint`             | ESLint     | `export default [...config, { /* overrides */ }]`                             |
| `@probex/configs/prettier`           | Prettier   | `export { default } from "@probex/configs/prettier"`                          |
| `@probex/configs/vitest`             | Vitest     | `mergeConfig(config, defineProject({ /* overrides */ }))` in a project config |

ESLint plugins are bundled as dependencies. `eslint`, `prettier`, `typescript` and `vitest` are optional peer
dependencies — install only the tools you use.
