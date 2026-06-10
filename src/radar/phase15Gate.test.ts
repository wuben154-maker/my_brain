import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * KP-09 gate: each KP-00..08 verification filter must map to a real test file
 * with a matching describe block (Vitest name filter convention).
 */
interface KpVerificationEntry {
  kp: string;
  filter: string;
  filePath: string;
  describeIncludes: string;
}

const REPO_ROOT = join(import.meta.dirname, "..", "..");

const KP_VERIFICATION_REGISTRY: KpVerificationEntry[] = [
  // KP-00 ui-contract
  { kp: "KP-00", filter: "ImmersiveScene", filePath: "src/components/shell/ImmersiveScene.test.ts", describeIncludes: "ImmersiveScene" },
  { kp: "KP-00", filter: "CompanionShell", filePath: "src/components/companion/CompanionShell.test.tsx", describeIncludes: "CompanionShell" },
  { kp: "KP-00", filter: "uiContract", filePath: "src/docs/uiContract.test.ts", describeIncludes: "uiContract" },

  // KP-01 default-radar-launch
  { kp: "KP-01", filter: "runLaunchSequence", filePath: "src/lib/runLaunchSequence.test.ts", describeIncludes: "runLaunchSequence" },
  { kp: "KP-01", filter: "selectDailyBriefing", filePath: "src/radar/selectDailyBriefing.test.ts", describeIncludes: "selectDailyBriefing" },
  { kp: "KP-01", filter: "dailyBriefing", filePath: "src/radar/dailyBriefing.integration.test.ts", describeIncludes: "dailyBriefing" },
  { kp: "KP-01", filter: "radarLaunch", filePath: "src/radar/radarLaunch.integration.test.ts", describeIncludes: "radarLaunch" },
  { kp: "KP-01", filter: "showcaseCoreLoop", filePath: "src/showcase/showcaseCoreLoop.integration.test.ts", describeIncludes: "showcaseCoreLoop" },
  { kp: "KP-01", filter: "sourceFailureRecovery", filePath: "src/radar/sourceFailureRecovery.test.ts", describeIncludes: "sourceFailureRecovery" },

  // KP-02 radar-companion-ui
  { kp: "KP-02", filter: "RadarCompanionCard", filePath: "src/components/companion/RadarCompanionCard.test.tsx", describeIncludes: "RadarCompanionCard" },
  { kp: "KP-02", filter: "BriefingSignalChip", filePath: "src/components/briefing/BriefingSignalChip.test.tsx", describeIncludes: "BriefingSignalChip" },
  { kp: "KP-02", filter: "dailyBriefing.integration", filePath: "src/radar/dailyBriefing.integration.test.ts", describeIncludes: "dailyBriefing" },

  // KP-03 weekly-review-mainflow
  { kp: "KP-03", filter: "buildWeeklyBrainReview", filePath: "src/cognitive/buildWeeklyBrainReview.test.ts", describeIncludes: "buildWeeklyBrainReview" },
  { kp: "KP-03", filter: "weeklyReview", filePath: "src/cognitive/weeklyReviewMainflow.test.ts", describeIncludes: "weeklyReview" },
  { kp: "KP-03", filter: "golden", filePath: "src/cognitive/buildWeeklyBrainReview.test.ts", describeIncludes: "buildWeeklyBrainReview" },
  { kp: "KP-03", filter: "graphHistoryCitation", filePath: "src/cognitive/weeklyReviewCitations.test.ts", describeIncludes: "graphHistoryCitation" },
  { kp: "KP-03", filter: "weeklyReviewMainflow", filePath: "src/cognitive/weeklyReviewMainflow.test.ts", describeIncludes: "weeklyReviewMainflow" },
  { kp: "KP-03", filter: "draftOnlyBoundary", filePath: "src/cognitive/draftOnlyBoundary.test.ts", describeIncludes: "draftOnlyBoundary" },

  // KP-04 feedback-persistence
  { kp: "KP-04", filter: "briefingStore", filePath: "src/stores/briefingStore.test.ts", describeIncludes: "briefingStore" },
  { kp: "KP-04", filter: "briefingFeedbackRepo", filePath: "src/storage/briefingFeedbackRepo.test.ts", describeIncludes: "briefingFeedbackRepo" },
  { kp: "KP-04", filter: "scoreWorldItems", filePath: "src/radar/scoreWorldItems.test.ts", describeIncludes: "scoreWorldItems" },
  { kp: "KP-04", filter: "feedbackReplay", filePath: "src/radar/feedbackReplay.test.ts", describeIncludes: "feedbackReplay" },

  // KP-05 profile-teaching-loop
  { kp: "KP-05", filter: "teachingDepth", filePath: "src/conversation/teachingDepth.test.ts", describeIncludes: "teachingDepth" },
  { kp: "KP-05", filter: "profileCorrection", filePath: "src/domain/profile/profileCorrection.test.ts", describeIncludes: "profileCorrection" },
  { kp: "KP-05", filter: "profileRerank", filePath: "src/radar/profileRerank.integration.test.ts", describeIncludes: "profileRerank" },
  { kp: "KP-05", filter: "integration", filePath: "src/conversation/teachingDepth.integration.test.ts", describeIncludes: "integration" },

  // KP-06 evals-docs
  { kp: "KP-06", filter: "docsSurface", filePath: "src/docs/docsSurface.test.ts", describeIncludes: "KOS-A4 docs surface" },
  { kp: "KP-06", filter: "docsLinks", filePath: "src/docs/docsSurface.test.ts", describeIncludes: "docsLinks" },
  { kp: "KP-06", filter: "keywords", filePath: "src/docs/docsSurface.test.ts", describeIncludes: "keywords" },

  // KP-07 storage-transaction-gate
  { kp: "KP-07", filter: "graphMutations", filePath: "src/lib/graphMutations.test.ts", describeIncludes: "graphMutations" },
  { kp: "KP-07", filter: "storageTransaction", filePath: "src/storage/storageTransaction.test.ts", describeIncludes: "storageTransaction" },
  { kp: "KP-07", filter: "undoRoundTrip", filePath: "src/storage/storageTransaction.test.ts", describeIncludes: "undoRoundTrip" },
  { kp: "KP-07", filter: "failureInjection", filePath: "src/storage/storageTransaction.test.ts", describeIncludes: "failureInjection" },

  // KP-08 project-node-minimal
  { kp: "KP-08", filter: "graph.project", filePath: "src/domain/graph.project.test.ts", describeIncludes: "graph.project" },
  { kp: "KP-08", filter: "exportGraphJson", filePath: "src/export/exportGraphJson.test.ts", describeIncludes: "exportGraphJson" },
  { kp: "KP-08", filter: "importGraphJson", filePath: "src/export/importGraphJson.roundtrip.test.ts", describeIncludes: "importGraphJson" },
  { kp: "KP-08", filter: "generateProjectSuggestions", filePath: "src/cognitive/generateProjectSuggestions.test.ts", describeIncludes: "generateProjectSuggestions" },
  { kp: "KP-08", filter: "brainMcpForbidden", filePath: "src/mcp/brainMcpForbidden.test.ts", describeIncludes: "brainMcpForbidden" },
];

/** KP-09 gate artifacts that must exist for orchestration. */
const KP09_GATE_ARTIFACTS = [
  "src/e2e/phase15MainLoop.e2e.test.ts",
  "src/radar/phase15Gate.test.ts",
  "src/showcase/showcaseCoreLoop.integration.test.ts",
  "src/e2e/companion.e2e.test.ts",
  "docs/evidence/KP-09-phase-1-5-gate.md",
];

function readTestSource(relativePath: string): string {
  const absolute = join(REPO_ROOT, relativePath);
  expect(existsSync(absolute), `${relativePath} must exist`).toBe(true);
  return readFileSync(absolute, "utf8");
}

function matchesVitestFilter(
  filePath: string,
  source: string,
  filter: string,
): boolean {
  if (filePath.includes(filter)) {
    return true;
  }
  const escaped = filter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const exact = new RegExp(`describe\\(\\s*["'\`]${escaped}`);
  if (exact.test(source)) {
    return true;
  }
  return new RegExp(`describe\\(\\s*["'\`][^"'\`]*${escaped}`).test(source);
}

describe("phase15Gate", () => {
  it("KP-09 gate artifact files exist", () => {
    for (const relativePath of KP09_GATE_ARTIFACTS) {
      expect(existsSync(join(REPO_ROOT, relativePath)), relativePath).toBe(true);
    }
  });

  it.each(KP_VERIFICATION_REGISTRY)(
    "$kp filter $filter maps to $filePath with describe $describeIncludes",
    ({ filter, filePath, describeIncludes }) => {
      const source = readTestSource(filePath);
      expect(
        matchesVitestFilter(filePath, source, filter) ||
          matchesVitestFilter(filePath, source, describeIncludes),
        `${filePath} must match vitest filter "${filter}" via path or describe`,
      ).toBe(true);
      expect(source.trim().length).toBeGreaterThan(0);
      expect(source).toMatch(/\b(it|test)\s*\(/);
    },
  );
});
