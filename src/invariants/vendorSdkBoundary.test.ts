import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

const SCANNED_ROOTS = [
  "src/domain",
  "src/agent",
  "src/conversation",
  "src/hooks",
] as const;

const FORBIDDEN_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "openai sdk", re: /from\s+['"]openai['"]/ },
  { label: "openai realtime", re: /from\s+['"]openai\/realtime/ },
  { label: "anthropic sdk", re: /from\s+['"]@anthropic-ai\// },
  { label: "axios", re: /from\s+['"]axios['"]/ },
  { label: "doubao / volcengine", re: /from\s+['"][^'"]*(doubao|volcengine|@volcengine)/i },
  { label: "tongyi / dashscope", re: /from\s+['"][^'"]*(dashscope|tongyi|@alicloud)/i },
  { label: "qwen sdk", re: /from\s+['"]@qwen/i },
  { label: "xunfei / iflytek", re: /from\s+['"][^'"]*(xunfei|iflytek)/i },
  { label: "direct fetch()", re: /\bfetch\s*\(/ },
];

function listSourceFiles(rootRelative: string): string[] {
  const absRoot = join(REPO_ROOT, rootRelative);
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      const stat = statSync(abs);
      if (stat.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry)) {
        continue;
      }
      if (/\.test\.(ts|tsx)$/.test(entry)) {
        continue;
      }
      files.push(relative(REPO_ROOT, abs).replace(/\\/g, "/"));
    }
  };
  walk(absRoot);
  return files.sort();
}

describe("vendorSdkBoundary", () => {
  for (const root of SCANNED_ROOTS) {
    it(`${root} has no vendor SDK or direct HTTP imports`, () => {
      const offenders: string[] = [];
      for (const file of listSourceFiles(root)) {
        const source = readFileSync(join(REPO_ROOT, file), "utf8");
        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.re.test(source)) {
            offenders.push(`${file} (${pattern.label})`);
          }
        }
      }
      expect(offenders).toEqual([]);
    });
  }
});
