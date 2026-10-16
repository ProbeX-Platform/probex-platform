import js from "@eslint/js";
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
    },
  },

  {
    files: ["**/*.test.ts"],
    rules: {
      "max-lines-per-function": "off",
    },
  },
];
