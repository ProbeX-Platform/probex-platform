import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { showAtRef } from "./git.js";

export interface WorkspacePackage {
  name: string;
  dir: string;
  deps: string[];
}

type Fields = Partial<Record<string, unknown>>;

interface PackageJson extends Fields {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const WORKSPACE_ROOTS = ["packages", "examples"];

export function workspacePackages(): WorkspacePackage[] {
  return WORKSPACE_ROOTS.flatMap((root) => (existsSync(root) ? readdirSync(root).map((dir) => join(root, dir)) : []))
    .filter((dir) => existsSync(join(dir, "package.json")))
    .map((dir) => {
      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as PackageJson;
      const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies });
      return { name: pkg.name, dir, deps };
    });
}

export function affectedPackages(
  packages: WorkspacePackage[],
  files: string[],
): { changed: string[]; affected: string[] } {
  const changed = packages.filter((pkg) => files.some((file) => file.startsWith(`${pkg.dir}/`))).map((pkg) => pkg.name);
  const affected = new Set(changed);
  let grew = true;
  while (grew) {
    grew = false;
    for (const pkg of packages) {
      if (!affected.has(pkg.name) && pkg.deps.some((dep) => affected.has(dep))) {
        affected.add(pkg.name);
        grew = true;
      }
    }
  }
  return { changed, affected: [...affected] };
}

export function packageFieldsChanged(base: string, file: string, fields: string[]): boolean {
  const before = showAtRef(base, file);
  if (before === undefined || !existsSync(file)) return true;
  const pick = (text: string): string => {
    const pkg = JSON.parse(text) as Fields;
    return JSON.stringify(fields.map((field) => pkg[field]));
  };
  return pick(before) !== pick(readFileSync(file, "utf8"));
}
