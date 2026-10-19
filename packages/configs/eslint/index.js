import js from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import { createNodeResolver, importX } from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.Config[]} */
export default [
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    ignores: ["**/dist/**", "**/coverage/**", "**/node_modules/**", "**/*.d.ts", "**/*.js"],
  },

  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      "import-x": importX,
    },
    settings: {
      // NodeNext imports use `.js` specifiers that point at `.ts` sources
      "import-x/resolver-next": [createNodeResolver({ extensionAlias: { ".js": [".ts", ".js"] } })],
    },
    rules: {
      "import-x/no-cycle": "error",
      "import-x/no-relative-packages": "error",
      "import-x/no-duplicates": "error",
      "import-x/order": [
        "error",
        {
          groups: [
            ["builtin", "external", "internal"],
            ["parent", "sibling", "index"],
          ],

          "newlines-between": "always",

          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],

      "no-warning-comments": ["error", { terms: ["todo", "fixme", "xxx", "hack"] }],
      "max-lines-per-function": ["error", { max: 50, skipBlankLines: true, skipComments: true }],
      // Arrow functions by default; a `function` expression stays allowed where `this` or a generator needs it
      "func-style": ["error", "expression"],
      "prefer-arrow-callback": "error",
    },
  },

  {
    files: ["**/*.test.ts"],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/no-disabled-tests": "error",
      "vitest/no-conditional-in-test": "error",
      "vitest/require-to-throw-message": "error",
      "vitest/max-nested-describe": ["error", { max: 2 }],
      "max-lines-per-function": "off",
    },
  },
];
