# @probex-platform/configs API

## Installation

```sh
pnpm add -D @probex-platform/configs
```

`eslint`, `prettier`, `typescript` and `vitest` are optional peer dependencies: install only the tools you use. The
ESLint plugins the preset needs come bundled.

## Exports

### `@probex-platform/configs/tsconfig/base.json`

```json
{ "extends": "@probex-platform/configs/tsconfig/base.json" }
```

Strict TypeScript for Node: `ES2024`, `NodeNext` modules, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
and `verbatimModuleSyntax`.

### `@probex-platform/configs/tsconfig/workspace.json`

```json
{ "extends": "@probex-platform/configs/tsconfig/workspace.json" }
```

`base.json` plus a composite build of one monorepo package: compiles `src/` to `dist/` with declarations and source
maps, and does not emit `*.test.ts`. Paths are relative to the extending `tsconfig.json`.

### `@probex-platform/configs/eslint`

```ts
declare const config: Linter.Config[];
export default config;
```

Flat config: typescript-eslint `strictTypeChecked` and `stylisticTypeChecked`, import order and cycles, and Vitest
rules for `*.test.ts`. Lints `*.ts` files only.

```js
import config from "@probex-platform/configs/eslint";

export default [...config, { rules: { "max-lines-per-function": "off" } }];
```

Type-aware rules find each file's `tsconfig.json` through the typescript-eslint project service. When editors run
ESLint from a package directory, set `tsconfigRootDir` in the root config, so files that only the root
`tsconfig.json` includes (such as `vitest.config.ts`) are still found:

```js
export default [...config, { languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } }];
```

### `@probex-platform/configs/prettier`

```ts
declare const config: Config;
export default config;
```

Prettier options: 120 columns, double quotes, semicolons, trailing commas.

```js
export { default } from "@probex-platform/configs/prettier";
```

### `createVitestConfig()`

```ts
const createVitestConfig: (options?: VitestConfigOptions) => UserWorkspaceConfig;
```

Builds the Vitest project config: runs `**/*.test.ts` and skips `dist/`.

**Parameters**

- `options` — [`VitestConfigOptions`](#vitestconfigoptions), optional.

**Returns** `UserWorkspaceConfig`, ready to export from `vitest.config.ts` or to pass to `mergeConfig()`.

**Errors** — none.

```ts
import { createVitestConfig } from "@probex-platform/configs/vitest";

export default createVitestConfig({ sourceCondition: "@acme/source" });
```

### `VitestConfigOptions`

```ts
interface VitestConfigOptions {
  sourceCondition?: string;
}
```

- `sourceCondition` — `string`, optional. An export condition resolved before Vite's defaults in both the client and
  server environments, so tests import workspace packages from their sources without a build. Without it, Vite's
  default conditions apply.

### `@probex-platform/configs/vitest` default export

```ts
declare const config: UserWorkspaceConfig;
export default config;
```

The result of `createVitestConfig()` without options.

```ts
export { default } from "@probex-platform/configs/vitest";
```

## Usage

A monorepo package `@acme/lib` exports its sources under a source condition next to its built entry. The condition
must be the first key: conditions match in key order, so after `default` it is silently ignored and tests run
against `dist/`.

```json
{
  "exports": {
    ".": {
      "@acme/source": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  }
}
```

Its `tsconfig.json` and `vitest.config.ts`:

```json
{ "extends": "@probex-platform/configs/tsconfig/workspace.json" }
```

```ts
import { createVitestConfig } from "@probex-platform/configs/vitest";
import { defineProject, mergeConfig } from "vitest/config";

export default mergeConfig(
  createVitestConfig({ sourceCondition: "@acme/source" }),
  defineProject({ test: { testTimeout: 10_000 } }),
);
```

ESLint and Prettier configs live in the repo root, as in the examples under [Exports](#exports).
