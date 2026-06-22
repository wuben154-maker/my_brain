#!/usr/bin/env node
/**
 * CLI entry invoked by apps/mobile/scripts/reset-demo.mjs
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DEMO_FIXTURE_NODE_COUNT, resetDemo } from "./resetDemo.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const defaultDbDir = join(root, "apps", "mobile", ".demo-reset");
const defaultDbPath = join(defaultDbDir, "mybrain.db");

const args = process.argv.slice(2);
const preserveProvider = !args.includes("--no-preserve-provider");
const withInboxCandidate = args.includes("--with-inbox-candidate");
const dbArg = args.find((arg) => arg.startsWith("--db="));
const dbPath = dbArg?.slice("--db=".length) ?? defaultDbPath;

if (!dbArg) {
  mkdirSync(defaultDbDir, { recursive: true });
}

const result = resetDemo({
  dbPath,
  preserveProviderConfig: preserveProvider,
  includeShowcaseProvisional: withInboxCandidate,
});

process.stdout.write(
  [
    "demo-reset: OK",
    `demoMode=${String(result.demoMode)}`,
    `seedVersion=${result.seedVersion}`,
    `graphNodes=${String(result.graphNodeCount)} (fixture=${String(DEMO_FIXTURE_NODE_COUNT)})`,
    `provisional=${String(result.provisionalCount)}`,
    `fingerprint=${result.fingerprint}`,
    `dbPath=${result.dbPath}`,
    preserveProvider ? "providerConfig=preserved" : "providerConfig=reset",
  ].join("\n") + "\n",
);
