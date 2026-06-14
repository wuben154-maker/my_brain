#!/usr/bin/env node
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildContext,
  printHelp,
  printResult,
  runStageChecks,
} from "./lib/stage-checks.mjs";
import { EXIT_CODES, VALID_STAGES} from "./lib/types.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function parseStageArg(argv) {
  const args = argv.filter((arg) => arg !== "--help" && arg !== "-h");
  if (args.length === 0) {
    return null;
  }
  const stage = args[0]?.toUpperCase();
  if (!stage || !VALID_STAGES.includes(stage)) {
    return null;
  }
  return stage;
}

function main() {
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
