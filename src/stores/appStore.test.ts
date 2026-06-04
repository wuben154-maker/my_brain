import { describe, expect, it, beforeEach } from "vitest";
import { useAppStore, type LaunchPhase } from "@/stores/appStore";

const LAUNCH_PHASE_LITERALS: LaunchPhase[] = [
  "boot",
  "self_check",
  "loading",
  "companion",
  "error",
];

describe("appStore (V0 LaunchPhase)", () => {
  beforeEach(() => {
    useAppStore.setState({ phase: "boot", errorMessage: null });
  });

  it("exposes exactly five LaunchPhase literals", () => {
    expect(LAUNCH_PHASE_LITERALS).toEqual([
      "boot",
      "self_check",
      "loading",
      "companion",
      "error",
    ]);
  });

  it("defaults to boot before launch sequence advances", () => {
    expect(useAppStore.getState().phase).toBe("boot");
  });

  it("setPhase(companion) enters companion shell", () => {
    useAppStore.getState().setPhase("companion");
    expect(useAppStore.getState().phase).toBe("companion");
  });
});
