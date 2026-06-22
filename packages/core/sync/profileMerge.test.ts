import { describe, expect, it } from "vitest";

import {
  applyProfileCorrection,
  createEmptyCorrectionState,
  seedTraitsFromProfile,
} from "../src/profile/correctionHistory.js";
import {
  detectProfileConflicts,
  mergeProfileCorrectionState,
  remoteWouldSilentlyOverwriteManual,
} from "../src/sync/profileMerge.js";
import { SyncConflictError } from "../src/sync/errors.js";

describe("sync profileMerge", () => {
  it("unions suppression lists from both devices", () => {
    const profile = {
      primaryMode: "learner" as const,
      secondaryModes: [] as const,
      confidence: 0.8,
      recentIntent: "学习 Rust",
    };
    let local = {
      ...createEmptyCorrectionState(),
      traits: seedTraitsFromProfile(profile),
    };
    local = applyProfileCorrection(local, "mode-learner", "suppress", "local manual");
    let remote = {
      ...createEmptyCorrectionState(),
      traits: seedTraitsFromProfile(profile),
    };
    remote = applyProfileCorrection(remote, "recent-intent", "suppress", "remote manual");

    const merged = mergeProfileCorrectionState({ local, remote });
    expect(merged.suppressionList).toContain("mode-learner");
    expect(merged.suppressionList).toContain("recent-intent");
  });

  it("never silently overwrites local manual correction with remote LLM trait", () => {
    const profile = {
      primaryMode: "learner" as const,
      secondaryModes: [] as const,
      confidence: 0.8,
    };
    let local = {
      ...createEmptyCorrectionState(),
      traits: seedTraitsFromProfile(profile),
    };
    local = applyProfileCorrection(local, "mode-learner", "manual_override", "我是创业者");
    const remote = {
      ...createEmptyCorrectionState(),
      traits: seedTraitsFromProfile(profile).map((t) =>
        t.id === "mode-learner"
          ? { ...t, source: "llm" as const, label: "LLM 推断学习者" }
          : t,
      ),
    };

    expect(remoteWouldSilentlyOverwriteManual(local, remote)).toBe(true);
    const merged = mergeProfileCorrectionState({ local, remote });
    const trait = merged.traits.find((t) => t.id === "mode-learner");
    expect(trait?.source).toBe("manual");
  });

  it("throws SyncConflictError when both sides have conflicting manual corrections", () => {
    const profile = {
      primaryMode: "learner" as const,
      secondaryModes: [] as const,
      confidence: 0.8,
    };
    let local = {
      ...createEmptyCorrectionState(),
      traits: seedTraitsFromProfile(profile),
    };
    local = applyProfileCorrection(local, "mode-learner", "suppress", "local");
    let remote = {
      ...createEmptyCorrectionState(),
      traits: seedTraitsFromProfile(profile),
    };
    remote = applyProfileCorrection(remote, "mode-learner", "restore", "remote");

    expect(detectProfileConflicts(local, remote)).toContain("mode-learner");
    expect(() => mergeProfileCorrectionState({ local, remote })).toThrow(SyncConflictError);
    try {
      mergeProfileCorrectionState({ local, remote });
    } catch (error) {
      expect(error).toBeInstanceOf(SyncConflictError);
      const typed = error as SyncConflictError;
      expect(typed.error_class).toBe("SyncConflictError");
      expect(typed.hint_code).toMatch(/^conflict:profile_field:/);
      expect(typed.root_cause_hint).toContain("mode-learner");
      expect(typed.safe_retry.length).toBeGreaterThan(10);
      expect(typed.stop_condition).toContain("3");
    }
  });

  it("resolves dual manual conflict when user chooses keep_local", () => {
    const profile = {
      primaryMode: "learner" as const,
      secondaryModes: [] as const,
      confidence: 0.8,
    };
    let local = {
      ...createEmptyCorrectionState(),
      traits: seedTraitsFromProfile(profile),
    };
    local = applyProfileCorrection(local, "mode-learner", "suppress", "local");
    let remote = {
      ...createEmptyCorrectionState(),
      traits: seedTraitsFromProfile(profile),
    };
    remote = applyProfileCorrection(remote, "mode-learner", "restore", "remote");

    const merged = mergeProfileCorrectionState({
      local,
      remote,
      resolution: { strategy: "keep_local" },
    });
    expect(merged.suppressionList).toEqual(local.suppressionList);
  });
});
