import { ESLint } from "eslint";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "../../../..");
const CONNECTOR_FILE = path.join(ROOT, "packages/sdk/src/connector/options.ts");

// Lints one import as if it were in a connector module, with the repository's real ESLint config
const findRestrictedImports = async (specifier: string): Promise<string[]> => {
  const eslint = new ESLint({ cwd: ROOT });
  const results = await eslint.lintText(`import "${specifier}";\n`, { filePath: CONNECTOR_FILE });
  return results.flatMap((result) =>
    result.messages.filter((message) => message.ruleId === "no-restricted-imports").map((message) => message.message),
  );
};

// The first lint builds a type-checked program, which takes longer than Vitest's default timeout
describe("connector imports", { timeout: 60_000 }, () => {
  it.each([
    "@probex-platform/protocol/src/index.js",
    "@probex-platform/sdk",
    "ws/lib/websocket.js",
    "undici",
    "util",
    "../logger/logger.js",
    "../debugger/index.js",
    "./../logger/index.js",
  ])("rejects %s", async (specifier) => {
    const messages = await findRestrictedImports(specifier);

    expect(messages).toHaveLength(1);
  });

  it.each(["@probex-platform/protocol", "ws", "../logger/index.js", "node:os", "./labels.js"])(
    "allows %s",
    async (specifier) => {
      const messages = await findRestrictedImports(specifier);

      expect(messages).toEqual([]);
    },
  );
});
