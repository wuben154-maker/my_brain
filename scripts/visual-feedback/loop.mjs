#!/usr/bin/env node
/**
 * Screenshot feedback loop: capture → pixel-compare vs assets/*.png → repeat.
 * Code changes are picked up via Vite HMR when using --watch.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  DEV_SERVER_URL,
  LOOP_DEFAULT_MAX_ROUNDS,
  LOOP_PASS_STREAK_REQUIRED,
  PATHS,
} from "./config.mjs";
import { captureAllScreenshots } from "./capture.mjs";
import { compareAllScreenshots } from "./compare.mjs";

const args = new Set(process.argv.slice(2));
const watch = args.has("--watch");
const once = args.has("--once");
const maxRounds = once
  ? 1
  : Number(
      args.has("--max-rounds")
        ? process.argv[process.argv.indexOf("--max-rounds") + 1]
        : LOOP_DEFAULT_MAX_ROUNDS,
    );

let devProcess = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerUp() {
  try {
    const response = await fetch(DEV_SERVER_URL, {
      signal: AbortSignal.timeout(1200),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureDevServer() {
  if (await isServerUp()) {
    return null;
  }

  console.log("[visual:loop] starting pnpm dev …");
  devProcess = spawn("pnpm", ["dev"], {
    cwd: PATHS.root,
    shell: true,
    stdio: "ignore",
    env: { ...process.env, BROWSER: "none" },
  });

  for (let i = 0; i < 60; i++) {
    if (await isServerUp()) {
      return devProcess;
    }
    await sleep(500);
  }

  throw new Error(`Timed out waiting for ${DEV_SERVER_URL}`);
}

function watchSrcOnce() {
  const srcDir = path.join(PATHS.root, "src");
  return new Promise((resolve) => {
    let timer = null;
    const watcher = fs.watch(srcDir, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        watcher.close();
        resolve();
      }, 600);
    });
  });
}

function printHints(report) {
  for (const target of report.targets) {
    if (target.pass) {
      continue;
    }
    console.log(
      `\n[visual:loop] ${target.label} (${target.id}) needs work · diff ${target.diffPercent} > ${(target.maxDiffRatio * 100).toFixed(1)}%`,
    );
    console.log(`  reference: ${target.paths?.reference}`);
    console.log(`  actual:    ${target.paths?.actual}`);
    console.log(`  heatmap:   ${target.paths?.diff}`);
  }
  console.log(
    "\n[visual:loop] Adjust src/index.css + components, save, loop will re-capture.",
  );
  console.log(
    `  HTML report: ${path.join(PATHS.artifacts, "index.html")}`,
  );
  console.log(
    "  Snapshot URLs: /?visual=boot  /?visual=main  /?visual=inbox  /?visual=insight",
  );
}

async function runRound(round) {
  console.log(`\n[visual:loop] —— round ${round} ——`);
  await captureAllScreenshots();
  const report = compareAllScreenshots();
  return report;
}

async function main() {
  fs.mkdirSync(PATHS.actualDir, { recursive: true });
  fs.mkdirSync(PATHS.diffDir, { recursive: true });

  try {
    await ensureDevServer();
    let passStreak = 0;

    for (let round = 1; round <= maxRounds; round++) {
      const report = await runRound(round);
      if (once) {
        process.exit(report.pass ? 0 : 1);
      }
      if (report.pass) {
        passStreak++;
        console.log(
          `[visual:loop] pass streak ${passStreak}/${LOOP_PASS_STREAK_REQUIRED}`,
        );
        if (passStreak >= LOOP_PASS_STREAK_REQUIRED) {
          console.log("[visual:loop] ✓ within threshold — done.");
          process.exit(0);
        }
      } else {
        passStreak = 0;
        printHints(report);
        if (!watch && round >= maxRounds) {
          process.exit(1);
        }
        if (!watch) {
          console.log(
            "[visual:loop] Re-run after edits: pnpm visual:loop --watch",
          );
          process.exit(1);
        }
        console.log("[visual:loop] waiting for src/ changes …");
        await watchSrcOnce();
      }
    }

    console.log("[visual:loop] max rounds reached without stable pass.");
    process.exit(1);
  } finally {
    if (devProcess) {
      devProcess.kill();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
