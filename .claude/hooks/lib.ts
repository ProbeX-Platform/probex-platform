import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const MAX_LINES = 20;

export function readInput(): unknown {
  return JSON.parse(readFileSync(0, "utf8"));
}

export function repoRoot(dir: string): string | undefined {
  try {
    return execFileSync("git", ["-C", dir, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

// Exit code 2 feeds stderr back to Claude; keep it short so it costs few tokens
export function block(rows: string[]): never {
  const shown =
    rows.length > MAX_LINES ? [...rows.slice(0, MAX_LINES), `… ${String(rows.length - MAX_LINES)} more`] : rows;
  process.stderr.write(`${shown.join("\n")}\n`);
  process.exit(2);
}
