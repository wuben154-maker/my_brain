/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTempStorage } from "@/invariants/testStorage";
import {
  VISUAL_INBOX_ENVELOPE,
  VISUAL_INSIGHT_RUN,
  VISUAL_INSIGHT_RUN_ID,
} from "@/lib/visualSnapshotFixtures";
import type { StorageProvider } from "@/storage/types";
import { useAppStore } from "@/stores/appStore";
import { useProposalStore } from "@/stores/proposalStore";
import { useResearchRunStore } from "@/stores/researchRunStore";
import { useUiStore } from "@/stores/uiStore";

const visualInboxStorageRef = vi.hoisted(() => ({
  current: null as StorageProvider | null,
}));

vi.mock("@/storage/createStorageProvider", () => ({
  createStorageProvider: () => {
    if (!visualInboxStorageRef.current) {
      throw new Error("visualInboxStorageRef not set");
    }
    return visualInboxStorageRef.current;
  },
}));

import {
  applyVisualSnapshot,
  bootstrapVisualInboxStorage,
  readVisualSnapshotId,
} from "@/lib/visualSnapshotMode";

describe("visualSnapshotMode (H2-3c insight)", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/");
    useResearchRunStore.getState().reset();
    useProposalStore.setState({ pending: [] });
    useUiStore.setState({ activeSection: "graph" });
    useAppStore.setState({ storage: null });
  });

  it("reads ?visual=insight from the URL", () => {
    window.location.search = "?visual=insight";
    expect(readVisualSnapshotId()).toBe("insight");
  });

  it("ignores ?visual= in non-dev builds (invariant #2)", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
    vi.resetModules();
    const { readVisualSnapshotId: readId } =
      await import("@/lib/visualSnapshotMode");
    window.location.search = "?visual=inbox";
    expect(readId()).toBeNull();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("bootstrapVisualInboxStorage is a no-op in non-dev builds (invariant #2)", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
    vi.resetModules();
    const { bootstrapVisualInboxStorage: bootstrap } =
      await import("@/lib/visualSnapshotMode");
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      visualInboxStorageRef.current = storage;
      await bootstrap();
      const graph = await storage.loadGraph();
      expect(graph.nodes).toHaveLength(0);
      expect(useAppStore.getState().storage).toBeNull();
    } finally {
      visualInboxStorageRef.current = null;
      cleanup();
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("bootstrapVisualInboxStorage wires SQLite and pending proposal", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      visualInboxStorageRef.current = storage;
      await bootstrapVisualInboxStorage();
      expect(useAppStore.getState().storage).toBe(storage);
      const pending = await storage.listPendingProposals();
      expect(pending.some((item) => item.id === VISUAL_INBOX_ENVELOPE.id)).toBe(
        true,
      );
      expect(
        useProposalStore
          .getState()
          .pending.some((item) => item.id === VISUAL_INBOX_ENVELOPE.id),
      ).toBe(true);
    } finally {
      visualInboxStorageRef.current = null;
      cleanup();
    }
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
