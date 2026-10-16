import { existsSync, readdirSync, readFileSync } from "node:fs";

import { titleProblem } from "./naming.js";

const ADR_DIR = "docs/adr";
const ADR_FILE = /^(\d{4})-[a-z0-9]+(-[a-z0-9]+)*\.md$/;
const ADR_SECTIONS = ["Status", "Context", "Decision", "Alternatives", "Consequences"];
const ADR_STATUS = /^(Proposed|Accepted|Deprecated|Superseded by \[\d{4}\])/;
const NOT_ADRS = new Set(["README.md", "0000-template.md"]);

export function docProblems(changed: string[]): string[] {
  const docs = changed.filter((file) => file.startsWith("docs/") && file.endsWith(".md") && existsSync(file));
  const titles = docs.filter((file) => !file.startsWith(`${ADR_DIR}/`)).flatMap(docTitleProblems);
  const adrs = changed.some((file) => file.startsWith(`${ADR_DIR}/`)) ? adrProblems() : [];
  return [...titles, ...adrs];
}

function docTitleProblems(file: string): string[] {
  const title = /^# (.+)$/m.exec(readFileSync(file, "utf8"))?.[1];
  const problem = title === undefined ? undefined : titleProblem(file, title);
  return problem ? [problem] : [];
}

function adrProblems(): string[] {
  const files = readdirSync(ADR_DIR)
    .filter((file) => file.endsWith(".md") && !NOT_ADRS.has(file))
    .sort();
  const index = existsSync(`${ADR_DIR}/README.md`) ? readFileSync(`${ADR_DIR}/README.md`, "utf8") : "";
  return files.flatMap((file, i) => adrFileProblems(file, i + 1, index));
}

function adrFileProblems(file: string, expected: number, index: string): string[] {
  const path = `${ADR_DIR}/${file}`;
  const number = ADR_FILE.exec(file)?.[1];
  if (number === undefined) return [`${path}: name must be NNNN-kebab-title.md`];
  const problems = adrContentProblems(path, readFileSync(path, "utf8"), number);
  if (Number(number) !== expected) {
    problems.push(`${path}: expected number ${String(expected).padStart(4, "0")}, ADRs are numbered without gaps`);
  }
  if (!index.includes(`(${file})`)) problems.push(`${path}: missing from ${ADR_DIR}/README.md index`);
  return problems;
}

function adrContentProblems(path: string, text: string, number: string): string[] {
  const problems: string[] = [];
  const heading = /^# (.+)$/m.exec(text)?.[1] ?? "";
  if (heading.startsWith(`${number}. `)) {
    const problem = titleProblem(path, heading.slice(number.length + 2));
    if (problem) problems.push(problem);
  } else {
    problems.push(`${path}: first heading must be "# ${number}. <Title>"`);
  }
  for (const section of ADR_SECTIONS) {
    if (!new RegExp(`^## ${section}$`, "m").test(text)) problems.push(`${path}: missing "## ${section}" section`);
  }
  const status = /^## Status\s*\n+(.+)$/m.exec(text)?.[1]?.trim();
  if (status !== undefined && !ADR_STATUS.test(status)) {
    problems.push(`${path}: status must be Proposed, Accepted, Deprecated or "Superseded by [NNNN](...)"`);
  }
  return problems;
}
