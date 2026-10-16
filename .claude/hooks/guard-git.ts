import { execFileSync } from "node:child_process";

import { block, readInput } from "./lib.js";
import { branchProblem, PROTECTED_BRANCHES } from "../../scripts/lib/naming.js";

interface PreToolUseInput {
  cwd: string;
  tool_input: { command?: string };
}

const CREATE_BRANCH =
  /\bgit\s+(?:checkout\s+-[bB]|switch\s+(?:-[cC]|--create)|branch)\s+["']?([^\s;&|"'()-][^\s;&|"'()]*)/g;
const COMMIT_OR_PUSH = /\bgit\s+(?:commit|push)\b/;
const PUSH_TO_PROTECTED = /\bgit\s+push\b[^;&|]*\s(?:\S+:)?(main|staging)\b/;

function currentBranch(cwd: string): string {
  try {
    return execFileSync("git", ["-C", cwd, "rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function main(): void {
  const { cwd, tool_input: input } = readInput() as PreToolUseInput;
  const command = input.command ?? "";
  const problems = [...command.matchAll(CREATE_BRANCH)]
    .map((match) => branchProblem(match[1] ?? ""))
    .filter((problem) => problem !== undefined);

  if (COMMIT_OR_PUSH.test(command) && PROTECTED_BRANCHES.has(currentBranch(cwd))) {
    problems.push(`on protected branch "${currentBranch(cwd)}": create a <type>/<kebab-case> branch first`);
  }
  if (PUSH_TO_PROTECTED.test(command)) problems.push("never push to main/staging: open a PR instead");
  if (problems.length > 0) block(problems);
}

main();
