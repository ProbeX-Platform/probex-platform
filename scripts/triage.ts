import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { COVERAGE_SUMMARY, runChecks, type Check } from "./lib/checks.js";
import { addedFiles, changedFiles, diffSize, git, mergeBase } from "./lib/git.js";
import { affectedPackages, packageFieldsChanged, workspacePackages } from "./lib/workspace.js";

type Kind = "none" | "docs-only" | "config" | "code";

type Action = "none" | "fix-checks" | "write-tests" | "delegate-unit-tester" | "e2e" | "review" | "adr" | "docs";

interface Touches {
  publicApi: boolean;
  protocol: boolean;
  transport: boolean;
  dependencies: boolean;
  newPackage: boolean;
  adr: boolean;
  apiDocs: boolean;
}

interface CoverageGap {
  file: string;
  pct: number;
  threshold: number;
  isNew: boolean;
}

interface Report {
  kind: Kind;
  base: string;
  files: number;
  diffLines: number;
  packages: { changed: string[]; affected: string[] };
  touches: Touches;
  checks: Check[];
  coverageGaps: CoverageGap[];
  actions: Action[];
}

type CoverageSummary = Partial<Record<string, { lines: { pct: number } }>>;

const PACKAGE_JSON = /^packages\/[^/]+\/package\.json$/;
const COVERED_SOURCE = /^packages\/[^/]+\/src\/.+(?<!\.test|\.d)\.ts$/;
const STRICT_COVERAGE = [/^packages\/protocol\//, /^packages\/sdk\/src\/core\//];
const REVIEW_DIFF_LINES = 300;
const DELEGATE_GAP_FILES = 3;

function classify(files: string[]): Kind {
  if (files.length === 0) return "none";
  if (files.every((file) => file.endsWith(".md") || file.startsWith("docs/"))) return "docs-only";
  const isCode = (file: string): boolean => /\.[cm]?[jt]s$/.test(file) && !/\.config\.[cm]?[jt]s$/.test(file);
  return files.some(isCode) ? "code" : "config";
}

function touches(files: string[], added: Set<string>, base: string): Touches {
  const manifests = files.filter((file) => PACKAGE_JSON.test(file));
  return {
    publicApi:
      files.some((file) => /^packages\/[^/]+\/src\/index\.ts$/.test(file)) ||
      manifests.some((file) => packageFieldsChanged(base, file, ["exports"])),
    protocol: files.some((file) => file.startsWith("packages/protocol/")),
    transport: files.some((file) => file.startsWith("packages/connector/src/")),
    dependencies: manifests.some((file) => packageFieldsChanged(base, file, ["dependencies", "peerDependencies"])),
    newPackage: manifests.some((file) => added.has(file)),
    adr: [...added].some((file) => /^docs\/adr\/\d{4}-.+\.md$/.test(file)),
    apiDocs: files.some((file) => file.startsWith("docs/api/")),
  };
}

function coverageGaps(files: string[], added: Set<string>): CoverageGap[] {
  const summary = existsSync(COVERAGE_SUMMARY)
    ? (JSON.parse(readFileSync(COVERAGE_SUMMARY, "utf8")) as CoverageSummary)
    : {};
  return files
    .filter((file) => COVERED_SOURCE.test(file) && existsSync(file))
    .map((file) => ({
      file,
      pct: summary[resolve(file)]?.lines.pct ?? 0,
      threshold: STRICT_COVERAGE.some((pattern) => pattern.test(file)) ? 90 : 85,
      isNew: added.has(file),
    }))
    .filter((gap) => gap.pct < gap.threshold);
}

function suggest(report: Omit<Report, "actions">): Action[] {
  const { touches: t, coverageGaps: gaps } = report;
  const actions: Action[] = [];
  if (report.checks.some((check) => !check.ok)) actions.push("fix-checks");
  if (gaps.length >= DELEGATE_GAP_FILES || gaps.some((gap) => gap.isNew && gap.pct === 0)) {
    actions.push("delegate-unit-tester");
  } else if (gaps.length > 0) {
    actions.push("write-tests");
  }
  if (t.protocol || t.transport || t.publicApi) actions.push("e2e");
  if (report.diffLines > REVIEW_DIFF_LINES || t.publicApi) actions.push("review");
  if ((t.newPackage || t.dependencies || t.protocol || t.publicApi) && !t.adr) actions.push("adr");
  if (t.publicApi && !t.apiDocs) actions.push("docs");
  return actions.length > 0 ? actions : ["none"];
}

function triage(): Report {
  const base = mergeBase();
  const files = changedFiles(base);
  const added = addedFiles(base);
  const kind = classify(files);
  const checks = kind === "none" ? [] : runChecks(files, base, kind === "docs-only");
  const report = {
    kind,
    base: base.slice(0, 7),
    files: files.length,
    diffLines: diffSize(base),
    packages: affectedPackages(workspacePackages(), files),
    touches: touches(files, added, base),
    checks,
    coverageGaps: kind === "code" || kind === "config" ? coverageGaps(files, added) : [],
  };
  return { ...report, actions: suggest(report) };
}

function format(report: Report): string {
  const touched = Object.entries(report.touches)
    .filter(([key, value]) => value && key !== "adr" && key !== "apiDocs")
    .map(([key]) => key);
  const rows = [
    `triage: ${report.kind} · ${String(report.files)} files · ${String(report.diffLines)} lines · base ${report.base}`,
    `packages: ${report.packages.changed.join(", ") || "-"} → affected: ${report.packages.affected.join(", ") || "-"}`,
    `touches: ${touched.join(", ") || "-"}`,
    `checks: ${report.checks.map((check) => `${check.ok ? "✓" : "✗"} ${check.name}`).join("  ") || "-"}`,
    ...report.checks
      .filter((check) => !check.ok)
      .flatMap((check) => [`✗ ${check.name}`, ...check.details.map((row) => `    ${row}`)]),
    ...report.coverageGaps.map(
      (gap) => `✗ coverage ${gap.file} ${String(gap.pct)}% < ${String(gap.threshold)}%${gap.isNew ? " (new)" : ""}`,
    ),
    `actions: ${report.actions.join(", ")}`,
  ];
  return `${rows.join("\n")}\n`;
}

process.chdir(git("rev-parse", "--show-toplevel"));
const report = triage();
process.stdout.write(process.argv.includes("--json") ? `${JSON.stringify(report, null, 2)}\n` : format(report));
process.exitCode = report.checks.some((check) => !check.ok) || report.coverageGaps.length > 0 ? 1 : 0;
