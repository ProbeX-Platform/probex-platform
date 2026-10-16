import { branchProblem, PROTECTED_BRANCHES, subjectProblem } from "./lib/naming.js";

const { BRANCH = "", TITLE = "" } = process.env;

const problems = [
  PROTECTED_BRANCHES.has(BRANCH) ? undefined : branchProblem(BRANCH),
  subjectProblem(TITLE.replace(/ \(#\d+\)$/, "")),
].filter((problem) => problem !== undefined);

for (const problem of problems) process.stderr.write(`${problem}\n`);
process.exitCode = problems.length > 0 ? 1 : 0;
