import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SCAFFOLD_ROOT = join(__dirname);
const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{10,}/,
  /api[_-]?key\s*[:=]\s*["'][^"']+["']/i,
  /Bearer\s+[a-zA-Z0-9._-]{20,}/,
  /password\s*[:=]\s*["'][^"']+["']/i,
];

function listScaffoldFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      listScaffoldFiles(full, acc);
    } else if (/\.(swift|plist|md|json|example\.plist)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("ios-share-extension no-secrets scaffold", () => {
  it("scaffold files exist and are auditable", () => {
    const files = listScaffoldFiles(SCAFFOLD_ROOT);
    expect(files.some((f) => f.endsWith("ShareViewController.swift"))).toBe(true);
    expect(files.some((f) => f.endsWith("Info.plist"))).toBe(true);
    expect(files.some((f) => f.endsWith("README.md"))).toBe(true);
  });

  it("contains no embedded secrets in scaffold sources", () => {
    const files = listScaffoldFiles(SCAFFOLD_ROOT);
    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const pattern of SECRET_PATTERNS) {
        expect(content, `${file} must not match ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("documents App Group id matching JS bridge", () => {
    const readme = readFileSync(join(SCAFFOLD_ROOT, "README.md"), "utf8");
    expect(readme).toContain("group.app.mybrain.shared");
    expect(readme).toContain("PENDING_DEVICE");
  });
});
