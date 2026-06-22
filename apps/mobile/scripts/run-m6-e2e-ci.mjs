#!/usr/bin/env node
/**
 * M6 machine CI runner: Maestro CLI presence check, yaml validation,
 * PENDING_DEVICE quarantine, optional machine_ci execution when adb device exists.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const E2E_DIR = join(__dirname, "..", "e2e");
const MAX_RETRIES = 2;

const REQUIRED_E2E_FILES = [
  "mainpath.yaml",
  "offline.yaml",
  "degraded.yaml",
  "profile-review.yaml",
  "voice-intent.yaml",
  "memory-experience.yaml",
  "persistence.yaml",
  "share-capture-android.yaml",
  "share-capture-ios.yaml",
  "share-no-permanent.yaml",
];

function log(section, message) {
  console.log(`[m6-e2e-ci:${section}] ${message}`);
}

function normalizeYamlText(text) {
  return text.replace(/\r\n/g, "\n");
}

function parseTagsBlock(text) {
  const normalized = normalizeYamlText(text);
  const tagsMatch = normalized.match(/^tags:\s*\n((?:\s+-\s+.+\n)+)/m);
  if (!tagsMatch) {
    return [];
  }
  return tagsMatch[1]
    .split("\n")
    .map((line) => /^\s*-\s+(.+)\s*$/.exec(line)?.[1]?.trim())
    .filter(Boolean);
}

function parseAppId(text) {
  return normalizeYamlText(text).match(/^appId:\s*(.+)$/m)?.[1]?.trim();
}

function classifyFlow(file, text) {
  const tags = parseTagsBlock(text);
  const appId = parseAppId(text);
  const errors = [];

  if (!appId) {
    errors.push("missing appId");
  } else if (appId !== "app.mybrain.personal") {
    errors.push(`unexpected appId: ${appId}`);
  }
  if (text.trim().length <= 20) {
    errors.push("flow body too short");
  }

  let bucket = "validate_only";
  if (tags.includes("PENDING_DEVICE")) {
    bucket = "pending_device";
  } else if (tags.includes("machine")) {
    bucket = "machine_ci";
  }

  return { file, bucket, tags, appId, errors };
}

function buildPlan() {
  return REQUIRED_E2E_FILES.map((file) => {
    const text = readFileSync(join(E2E_DIR, file), "utf8");
    return classifyFlow(file, text);
  });
}

function maestroAvailable() {
  const result = spawnSync("maestro", ["--version"], { encoding: "utf8" });
  if (result.status !== 0) {
    log("maestro", "CLI not available (install step may have failed)");
    return false;
  }
  log("maestro", (result.stdout || result.stderr).trim() || "ok");
  return true;
}

function deviceAvailable() {
  const adb = spawnSync("adb", ["devices"], { encoding: "utf8" });
  if (adb.status !== 0) {
    log("device", "adb unavailable — Maestro execution deferred");
    return false;
  }
  const ready = adb.stdout
    .split("\n")
    .slice(1)
    .some((line) => line.trim().endsWith("device"));
  log("device", ready ? "adb device ready" : "no adb device — execution deferred");
  return ready;
}

function runMaestroFlow(flowPath) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    log("exec", `maestro test ${flowPath} (attempt ${attempt}/${MAX_RETRIES})`);
    const result = spawnSync("maestro", ["test", flowPath], { stdio: "inherit" });
    if (result.status === 0) {
      return true;
    }
    if (attempt < MAX_RETRIES) {
      log("exec", `retrying after failure (exit ${result.status ?? "unknown"})`);
    }
  }
  return false;
}

function main() {
  const plan = buildPlan();
  const invalid = plan.filter((flow) => flow.errors.length > 0);
  const machineCi = plan.filter((flow) => flow.bucket === "machine_ci");
  const pendingDevice = plan.filter((flow) => flow.bucket === "pending_device");
  const validateOnly = plan.filter((flow) => flow.bucket === "validate_only");

  if (invalid.length > 0) {
    for (const flow of invalid) {
      log("validate", `${flow.file}: ${flow.errors.join("; ")}`);
    }
    process.exit(1);
  }

  log("validate", `required flows validated: ${plan.length}`);
  log(
    "quarantine",
    `${pendingDevice.length} PENDING_DEVICE flow(s) excluded from CI pass: ${pendingDevice
      .map((flow) => flow.file)
      .join(", ")}`,
  );
  log(
    "machine",
    `${machineCi.length} machine_ci flow(s): ${machineCi.map((flow) => flow.file).join(", ")}`,
  );
  log(
    "validate-only",
    `${validateOnly.length} validate_only flow(s): ${validateOnly
      .map((flow) => flow.file)
      .join(", ")}`,
  );

  const mode = process.env.M6_E2E_CI_MODE ?? "auto";
  const canExecute =
    mode === "execute" || (mode === "auto" && maestroAvailable() && deviceAvailable());

  if (mode === "validate-only" || !canExecute) {
    log(
      "result",
      "validation PASS; Maestro execution skipped. PENDING_DEVICE flows quarantined — not counted as PASS.",
    );
    process.exit(0);
  }

  for (const flow of machineCi) {
    if (!runMaestroFlow(join(E2E_DIR, flow.file))) {
      log("result", "Maestro execution FAIL for machine_ci flows");
      process.exit(1);
    }
  }

  log(
    "result",
    `Maestro execution PASS for ${machineCi.length} machine_ci flow(s); ${pendingDevice.length} device flow(s) remain quarantined.`,
  );
  process.exit(0);
}

main();
