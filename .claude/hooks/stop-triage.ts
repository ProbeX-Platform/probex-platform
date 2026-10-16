import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { block, readInput, repoRoot } from "./lib.js";
import { changedFiles, git, mergeBase, untrackedFiles } from "../../scripts/lib/git.js";
import { bin, run } from "../../scripts/lib/run.js";

interface StopInput {
  cwd: string;
  stop_hook_active?: boolean;
}

const CACHE = "node_modules/.cache/probex/triage-green";
const FAILURE_ROW = /^(✗|\s{4}|actions:)/;

// Same tree as the last green triage means nothing to re-check
function treeKey(): string {
  const hash = createHash("sha256")
    .update(git("rev-parse", "HEAD"))
    .update(git("diff", "HEAD", "--binary"));
  for (const file of untrackedFiles()) hash.update(file).update(readFileSync(file));
  return hash.digest("hex");
}

function main(): void {
  const input = readInput() as StopInput;
  if (input.stop_hook_active === true) return;
  const root = repoRoot(input.cwd);
  if (root === undefined) return;
  process.chdir(root);
  if (changedFiles(mergeBase()).length === 0) return;

  const key = treeKey();
  if (existsSync(CACHE) && readFileSync(CACHE, "utf8") === key) return;
  const result = run(bin("tsx"), ["scripts/triage.ts"]);
  if (result.ok) {
    mkdirSync(dirname(CACHE), { recursive: true });
    writeFileSync(CACHE, key);
    return;
  }
  block(["pnpm triage is red:", ...result.output.split("\n").filter((row) => FAILURE_ROW.test(row))]);
}

main();
