import config from "@probex-platform/configs/eslint";

export default [
  ...config,
  {
    // Editors run ESLint from a package directory;
    // the root tsconfig.json still owns the config and test files
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // The logger moves with the connector if it becomes its own package: docs/architecture/sdk/logger.md
    files: ["packages/sdk/src/logger/**/*.ts"],
    ignores: ["**/*.test.ts", "**/*.test-d.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: String.raw`^(?!node:|\./(?!.*\.\.))`,
              message: "The logger imports only Node built-ins (node:*) and its own files (./*).",
            },
          ],
        },
      ],
    },
  },
];
