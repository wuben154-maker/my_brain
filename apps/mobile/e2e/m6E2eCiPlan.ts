import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** M6 machine-scope Maestro templates — aligned with m6E2eManifest.test.ts */
export const M6_REQUIRED_E2E_FILES = [
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
] as const;

export type M6E2eCiBucket = "machine_ci" | "pending_device" | "validate_only";

export interface M6E2eFlowPlan {
  file: string;
  bucket: M6E2eCiBucket;
  tags: string[];
  appId?: string;
  errors: string[];
}

const TAG_LINE = /^\s*-\s+(.+)\s*$/;

function normalizeYamlText(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

function parseTagsBlock(text: string): string[] {
  const normalized = normalizeYamlText(text);
  const tagsMatch = normalized.match(/^tags:\s*\n((?:\s+-\s+.+\n)+)/m);
  if (!tagsMatch) {
    return [];
  }
  return tagsMatch[1]
    .split("\n")
    .map((line) => TAG_LINE.exec(line)?.[1]?.trim())
    .filter((tag): tag is string => Boolean(tag));
}

function parseAppId(text: string): string | undefined {
  const match = normalizeYamlText(text).match(/^appId:\s*(.+)$/m);
  return match?.[1]?.trim();
}

export function classifyM6E2eFlow(file: string, text: string): M6E2eFlowPlan {
  const tags = parseTagsBlock(text);
  const appId = parseAppId(text);
  const errors: string[] = [];

  if (!appId) {
    errors.push("missing appId");
  } else if (appId !== "app.mybrain.personal") {
    errors.push(`unexpected appId: ${appId}`);
  }

  if (text.trim().length <= 20) {
    errors.push("flow body too short");
  }

  let bucket: M6E2eCiBucket = "validate_only";
  if (tags.includes("PENDING_DEVICE")) {
    bucket = "pending_device";
  } else if (tags.includes("machine")) {
    bucket = "machine_ci";
  }

  return { file, bucket, tags, appId, errors };
}

export function buildM6E2eCiPlan(e2eDir: string): M6E2eFlowPlan[] {
  return M6_REQUIRED_E2E_FILES.map((file) => {
    const text = readFileSync(join(e2eDir, file), "utf8");
    return classifyM6E2eFlow(file, text);
  });
}

export function summarizeM6E2eCiPlan(plan: M6E2eFlowPlan[]) {
  const invalid = plan.filter((flow) => flow.errors.length > 0);
  const machineCi = plan.filter((flow) => flow.bucket === "machine_ci");
  const pendingDevice = plan.filter((flow) => flow.bucket === "pending_device");
  const validateOnly = plan.filter((flow) => flow.bucket === "validate_only");

  return {
    invalid,
    machineCi,
    pendingDevice,
    validateOnly,
    quarantineCount: pendingDevice.length,
    machineCiCount: machineCi.length,
  };
}

export function listE2eYamlFiles(e2eDir: string): string[] {
  return readdirSync(e2eDir)
    .filter((name) => name.endsWith(".yaml"))
    .sort();
}
