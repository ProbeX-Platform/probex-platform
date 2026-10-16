import { branchProblem, PROTECTED_BRANCHES, subjectProblem } from "./lib/naming.js";

const { BRANCH = "", TITLE = "" } = process.env;

const branch = PROTECTED_BRANCHES.has(BRANCH) ? undefined : branchProblem(BRANCH);
// Squash merges turn the PR title into the commit on main
const title = subjectProblem(TITLE.replace(/ \(#\d+\)$/, ""));

const problems = [branch, title === undefined ? undefined : `PR title: ${title}`].filter(
  (problem) => problem !== undefined,
);

for (const problem of problems) process.stderr.write(`${problem}\n`);
process.exitCode = problems.length > 0 ? 1 : 0;
