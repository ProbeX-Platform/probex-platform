import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

export function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

export function lines(text: string): string[] {
  return text.split("\n").filter((line) => line !== "");
}

export function mergeBase(): string {
  for (const ref of [process.env.BASE ?? "origin/main", "main"]) {
    try {
      return git("merge-base", ref, "HEAD");
    } catch {
      // ref is missing locally, try the next one
    }
  }
  return git("rev-parse", "HEAD");
}

export function untrackedFiles(): string[] {
  return lines(git("ls-files", "--others", "--exclude-standard"));
}

export function changedFiles(base: string): string[] {
  return [...new Set([...lines(git("diff", "--name-only", base)), ...untrackedFiles()])].sort();
}

export function addedFiles(base: string): Set<string> {
  return new Set([...lines(git("diff", "--name-only", "--diff-filter=A", base)), ...untrackedFiles()]);
}

export function diffSize(base: string): number {
  const tracked = lines(git("diff", "--numstat", base)).reduce((sum, row) => {
    const [added = "0", deleted = "0"] = row.split("\t");
    return sum + (Number(added) || 0) + (Number(deleted) || 0);
  }, 0);
  const untracked = untrackedFiles().reduce((sum, file) => sum + lines(readFileSync(file, "utf8")).length, 0);
  return tracked + untracked;
}

export function showAtRef(ref: string, file: string): string | undefined {
  try {
    return git("show", `${ref}:${file}`);
  } catch {
    return undefined;
  }
}
