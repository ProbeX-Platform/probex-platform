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
  {
    // The connector may become its own package with the logger: docs/architecture/sdk/connector.md#boundaries
    files: ["packages/sdk/src/connector/**/*.ts"],
    ignores: ["**/*.test.ts", "**/*.test-d.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: String.raw`^(?!node:|@probex-platform/protocol$|ws$|\.\./logger/index\.js$|\./(?!.*\.\.))`,
              message:
                "The connector imports only @probex-platform/protocol, ws, the SDK logger (../logger/index.js), " +
                "Node built-ins (node:*) and its own files (./*).",
            },
          ],
        },
      ],
    },
  },
];
