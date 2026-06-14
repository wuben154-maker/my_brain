import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function readText(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

export function fileExists(path: string): boolean {
  return existsSync(path);
}

export function readJson<T>(path: string): T | null {
  const text = readText(path);
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function readPackageScripts(packageJsonPath: string): Record<string, string> | null {
  const pkg = readJson<{ scripts?: Record<string, string> }>(packageJsonPath);
  return pkg?.scripts ?? null;
}

export function readPackageDependencies(packageJsonPath: string): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} | null {
  const pkg = readJson<{
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }>(packageJsonPath);
  if (!pkg) {
    return null;
  }
  return {
    dependencies: pkg.dependencies ?? {},
    devDependencies: pkg.devDependencies ?? {},
  };
}

export function resolveFromRoot(root: string, relativePath: string): string {
  return join(root, relativePath);
}

export function globStageSpec(root: string, stage: string): string | null {
  const dir = resolveFromRoot(root, "specs/mobile-app");
  if (!fileExists(dir)) {
    return null;
  }
  const match = readdirSync(dir).find(
    (name) => name.startsWith(`${stage}-`) && name.endsWith(".md"),
  );
  return match ? join(dir, match) : null;
}

export function reportPathForStage(stage: string): string {
  return `specs/mobile-app/reports/${stage}-GATE-report.md`;
}
