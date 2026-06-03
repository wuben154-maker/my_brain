/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  VISUAL_INSIGHT_RUN,
  VISUAL_INSIGHT_RUN_ID,
} from "@/lib/visualSnapshotFixtures";
import {
  applyVisualSnapshot,
  readVisualSnapshotId,
} from "@/lib/visualSnapshotMode";
import { useProposalStore } from "@/stores/proposalStore";
import { useResearchRunStore } from "@/stores/researchRunStore";
import { useUiStore } from "@/stores/uiStore";

describe("visualSnapshotMode (H2-3c insight)", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/");
    useResearchRunStore.getState().reset();
    useProposalStore.setState({ pending: [] });
    useUiStore.setState({ activeSection: "graph" });
  });

  it("reads ?visual=insight from the URL", () => {
    window.location.search = "?visual=insight";
    expect(readVisualSnapshotId()).toBe("insight");
  });

  it("applyVisualSnapshot(insight) seeds trace, proposals, and insight section", () => {
    applyVisualSnapshot("insight");
    expect(useUiStore.getState().activeSection).toBe("insight");
    expect(useResearchRunStore.getState().selectedRunId).toBe(
      VISUAL_INSIGHT_RUN_ID,
    );
    expect(useResearchRunStore.getState().runs[0]?.runId).toBe(
      VISUAL_INSIGHT_RUN.runId,
    );
    expect(
      useProposalStore
        .getState()
        .pending.every((item) => item.source === "research_loop"),
    ).toBe(true);
  });
});
