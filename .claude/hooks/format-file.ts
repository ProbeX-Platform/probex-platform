import { existsSync } from "node:fs";
import { dirname, extname, relative, sep } from "node:path";

import { block, readInput, repoRoot } from "./lib.js";
import { bin, run, tail } from "../../scripts/lib/run.js";

interface PostToolUseInput {
  tool_input: { file_path?: string };
}

const FORMATTABLE = new Set([".ts", ".js", ".mjs", ".cjs", ".json", ".md"]);

function main(): void {
  const file = (readInput() as PostToolUseInput).tool_input.file_path;
  if (file === undefined || !FORMATTABLE.has(extname(file)) || !existsSync(file)) return;
  const root = repoRoot(dirname(file));
  if (root === undefined) return;
  const path = relative(root, file);
  if (path.startsWith("..") || path.split(sep).includes("node_modules")) return;

  process.chdir(root);
  const results = [run(bin("prettier"), ["--write", "--ignore-unknown", "--log-level", "warn", path])];
  if (path.endsWith(".ts")) results.push(run(bin("eslint"), ["--fix", "--no-warn-ignored", path]));
  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) block(failed.flatMap((result) => tail(result.output, 20)));
}

main();
