import { ESLint } from "eslint";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../../../..");
const LOGGER_FILE = path.join(ROOT, "packages/sdk/src/logger/level.ts");

// Lints one import as if it were in a logger module, with the repository's real ESLint config
const findRestrictedImports = async (specifier: string): Promise<string[]> => {
  const eslint = new ESLint({ cwd: ROOT });
  const results = await eslint.lintText(`import "${specifier}";\n`, { filePath: LOGGER_FILE });
  return results.flatMap((result) =>
    result.messages.filter((message) => message.ruleId === "no-restricted-imports").map((message) => message.message),
  );
};

// The first lint builds a type-checked program, which takes longer than Vitest's default timeout
describe("logger imports", { timeout: 60_000 }, () => {
  it.each(["@probex-platform/protocol", "vitest", "../connector/index.js", "./../connector/index.js", "util"])(
    "rejects %s",
    async (specifier) => {
      const messages = await findRestrictedImports(specifier);

      expect(messages).toHaveLength(1);
    },
  );

  it.each(["node:util", "./context.js"])("allows %s", async (specifier) => {
    const messages = await findRestrictedImports(specifier);

    expect(messages).toEqual([]);
  });
});
