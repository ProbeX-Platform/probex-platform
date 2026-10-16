import { existsSync, rmSync } from "node:fs";

import { docProblems } from "./docs.js";
import { git, lines } from "./git.js";
import { branchProblem, PROTECTED_BRANCHES, subjectProblem } from "./naming.js";
import { bin, fromProblems, run, SKIPPED, tail, type RunResult } from "./run.js";

export interface Check {
  name: string;
  ok: boolean;
  details: string[];
}

export const COVERAGE_SUMMARY = "coverage/coverage-summary.json";

const FORMATTABLE = /\.(ts|js|mjs|cjs|json|md|ya?ml)$/;
const DETAIL_LINES = 15;

export function runChecks(changed: string[], base: string, docsOnly: boolean): Check[] {
  const files = changed.filter((file) => existsSync(file));
  const checks = [
    toCheck("format", formatCheck(files)),
    toCheck("names", namesCheck(base)),
    toCheck("docs", fromProblems(docProblems(files))),
  ];
  if (docsOnly) return checks;
  return [
    ...checks,
    toCheck("lint", lintCheck(files)),
    toCheck("types", typesCheck(base)),
    toCheck("tests", testsCheck(base)),
  ];
}

function toCheck(name: string, result: RunResult): Check {
  return { name, ok: result.ok, details: result.ok ? [] : tail(result.output, DETAIL_LINES) };
}

function formatCheck(files: string[]): RunResult {
  const targets = files.filter((file) => FORMATTABLE.test(file));
  return targets.length ? run(bin("prettier"), ["--check", "--ignore-unknown", ...targets]) : SKIPPED;
}

function lintCheck(files: string[]): RunResult {
  const targets = files.filter((file) => file.endsWith(".ts"));
  return targets.length ? run(bin("eslint"), ["--no-warn-ignored", "--max-warnings", "0", ...targets]) : SKIPPED;
}

function typesCheck(base: string): RunResult {
  const packages = run("pnpm", ["--filter", `...[${base}]`, "typecheck"]);
  const root = run(bin("tsc"), ["-p", "."]);
  return { ok: packages.ok && root.ok, output: [packages.ok ? "" : packages.output, root.output].join("\n") };
}

function testsCheck(base: string): RunResult {
  rmSync(COVERAGE_SUMMARY, { force: true });
  return run(bin("vitest"), ["run", "--changed", base, "--coverage", "--passWithNoTests"]);
}

function namesCheck(base: string): RunResult {
  const branch = git("rev-parse", "--abbrev-ref", "HEAD");
  const branchIssue = PROTECTED_BRANCHES.has(branch) || branch === "HEAD" ? undefined : branchProblem(branch);
  const subjects = lines(git("log", "--format=%s", `${base}..HEAD`));
  const problems = [branchIssue, ...subjects.map(subjectProblem)].filter((problem) => problem !== undefined);
  return fromProblems(problems);
}
