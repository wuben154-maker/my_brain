#!/usr/bin/env node
/**
 * TypeScript source for the mobile gate verifier.
 * Runtime entry on Node 20: tools/mobile-execution/verify-stage.mjs
 * (pnpm mobile:gate wires the .mjs entry; keep .ts/.mjs logic in sync).
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildContext,
  printHelp,
  printResult,
  runStageChecks,
} from "./lib/stage-checks.ts";
import { EXIT_CODES, VALID_STAGES, type StageId } from "./lib/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function parseStageArg(argv: string[]): StageId | null {
  const args = argv.filter((arg) => arg !== "--help" && arg !== "-h");
  if (args.length === 0) {
    return null;
  }
  const stage = args[0]?.toUpperCase();
  if (!stage || !VALID_STAGES.includes(stage as StageId)) {
    return null;
  }
  return stage as StageId;
}

function main(): void {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const stage = parseStageArg(process.argv.slice(2));
  if (!stage) {
    printHelp();
    process.stderr.write("\nError: missing or invalid stage argument.\n");
    process.exit(1);
  }

  const ctx = buildContext(root, stage);
  const { checks, verdict } = runStageChecks(ctx);
  printResult(stage, checks, verdict);
  process.exit(EXIT_CODES[verdict]);
}

main();
