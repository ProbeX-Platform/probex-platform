import { spawnSync } from "node:child_process";
import { join } from "node:path";

export interface RunResult {
  ok: boolean;
  output: string;
}

export const SKIPPED: RunResult = { ok: true, output: "" };

export function run(command: string, args: string[]): RunResult {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
  });
  const output = result.error ? result.error.message : `${result.stdout}\n${result.stderr}`;
  return { ok: result.status === 0, output: output.trim() };
}

export function bin(name: string): string {
  return join(process.cwd(), "node_modules", ".bin", name);
}

export function tail(text: string, max: number): string[] {
  const rows = text.split("\n").filter((row) => row.trim() !== "");
  return rows.length > max ? ["…", ...rows.slice(-max)] : rows;
}

export function fromProblems(problems: string[]): RunResult {
  return { ok: problems.length === 0, output: problems.join("\n") };
}
