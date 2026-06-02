#!/usr/bin/env node
// Cursor `stop` hook: enforce the harness verification gate at the end of an
// agent turn. Runs `pnpm check` (typecheck + lint + invariant tests) ONLY when
// code changed, and asks the agent to fix red checks before declaring done.
//
// Design (per AGENT.md / specs harness rules):
// - Cross-platform: pure Node, no bash/jq dependency (Windows-friendly).
// - Fail-open: any hook error / missing pnpm → allow, never block real work.
// - Cheap on no-op turns: skips when there are no code changes (e.g. Q&A turns).

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const CODE_RE = /\.(ts|tsx|mjs|cjs|js)$/;
const CODE_PREFIXES = ["src/", "package.json", "tsconfig", ".cursor/hooks/"];

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

/** Emit hook JSON on stdout and exit 0 (always fail-open). */
function done(payload) {
  process.stdout.write(JSON.stringify(payload ?? {}));
  process.exit(0);
}

function hasCodeChanges() {
  const res = spawnSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
    shell: false,
  });
  if (res.status !== 0 || !res.stdout) return false;
  return res.stdout
    .split("\n")
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    .some(
      (p) => CODE_RE.test(p) || CODE_PREFIXES.some((pre) => p.startsWith(pre)),
    );
}

function runCheck() {
  // shell:true so Windows resolves pnpm.cmd; output to stderr-safe buffers.
  return spawnSync("pnpm check", {
    encoding: "utf8",
    shell: true,
    timeout: 170_000,
  });
}

// Consume stdin (hook contract) but we don't need its contents.
readStdin();

try {
  if (!hasCodeChanges()) {
    done({});
  }

  const res = runCheck();

  // pnpm/node not found or spawn error → fail open.
  if (res.error || res.status === null) {
    done({});
  }

  if (res.status === 0) {
    done({});
  }

  const tail = `${res.stdout ?? ""}${res.stderr ?? ""}`.slice(-1500);
  done({
    followup_message:
      "校验闸门未通过（`pnpm check`：typecheck + lint + 不变量测试）。" +
      "请先修复后再结束本回合；不要在红灯状态下声称完成。\n\n" +
      "失败输出节选：\n" +
      tail,
  });
} catch {
  done({});
}
