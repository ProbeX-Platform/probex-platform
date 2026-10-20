import config from "@probex/configs/eslint";

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
];
