import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function readText(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

export function fileExists(path) {
  return existsSync(path);
}

export function readJson(path) {
  const text = readText(path);
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function readPackageScripts(packageJsonPath) {
  const pkg = readJson(packageJsonPath);
  return pkg?.scripts ?? null;
}

export function readPackageDependencies(packageJsonPath) {
  const pkg = readJson(packageJsonPath);
  if (!pkg) {
    return null;
  }
  return {
    dependencies: pkg.dependencies ?? {},
    devDependencies: pkg.devDependencies ?? {},
  };
}

export function resolveFromRoot(root, relativePath) {
  return join(root, relativePath);
}

export function globStageSpec(root, stage) {
  const dir = resolveFromRoot(root, "specs/mobile-app");
  if (!fileExists(dir)) {
    return null;
  }
  const match = readdirSync(dir).find(
    (name) => name.startsWith(`${stage}-`) && name.endsWith(".md"),
  );
  return match ? join(dir, match) : null;
}

export function reportPathForStage(stage) {
  return `specs/mobile-app/reports/${stage}-GATE-report.md`;
}
