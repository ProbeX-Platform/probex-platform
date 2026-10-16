export const TYPES = ["feat", "fix", "chore", "docs", "refactor", "test", "perf", "build", "ci", "revert"] as const;

export const LIMITS = { branch: 50, subject: 72, title: 60 } as const;

export const PROTECTED_BRANCHES = new Set(["main", "staging"]);

const BRANCH = new RegExp(`^(${TYPES.join("|")})/[a-z0-9]+(-[a-z0-9]+)*$`);
const SUBJECT = new RegExp(`^(${TYPES.join("|")})(\\([a-z0-9-]+\\))?!?: \\S`);

export function branchProblem(name: string): string | undefined {
  if (!BRANCH.test(name)) return `branch "${name}" must be <type>/<kebab-case>, type is one of ${TYPES.join("|")}`;
  if (name.length > LIMITS.branch) {
    return `branch "${name}" is ${String(name.length)} chars, max ${String(LIMITS.branch)}`;
  }
  return undefined;
}

export function subjectProblem(subject: string): string | undefined {
  if (!SUBJECT.test(subject)) return `"${subject}" must follow Conventional Commits: <type>(<scope>)?: <summary>`;
  if (subject.length > LIMITS.subject) {
    return `"${subject}" is ${String(subject.length)} chars, max ${String(LIMITS.subject)}`;
  }
  return undefined;
}

export function titleProblem(where: string, title: string): string | undefined {
  if (title.length <= LIMITS.title) return undefined;
  return `${where}: title is ${String(title.length)} chars, max ${String(LIMITS.title)}`;
}
