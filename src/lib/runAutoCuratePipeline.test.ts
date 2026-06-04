import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTempStorage } from "@/invariants/testStorage";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { runAutoCurateAfterIngest } from "@/lib/runAutoCuratePipeline";
import * as autoCurateModule from "@/agent/curation/autoCurate";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";

describe("runAutoCurateAfterIngest", () => {
  beforeEach(() => {
    useGraphHistoryStore.getState().clear();
    vi.restoreAllMocks();
  });

  it("applies auto-curate proposals and writes graph history", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      const node = {
        id: "n1",
        title: "RAG",
        intro: "intro",
        sourceUrl: null,
        archived: false,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      };
      await storage.saveConcept(node);

      vi.spyOn(autoCurateModule, "autoCurate").mockReturnValue([
        {
          id: "p-link",
          kind: "link",
          summary: "link two",
          payload: {
            sourceId: "n1",
            targetId: "n2",
            relationType: "related",
          },
        },
      ]);

      await storage.saveConcept({
        ...node,
        id: "n2",
        title: "RAG detail",
      });

      const entries = await runAutoCurateAfterIngest("n1", {
        storage,
        profile: DEFAULT_USER_PROFILE,
      });

      expect(entries.length).toBeGreaterThan(0);
      const history = await storage.listGraphHistory();
      expect(history.some((row) => row.id === "p-link")).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("records one GraphHistoryEntry per applied auto-curate proposal (V4)", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      const node = {
        id: "n1",
        title: "RAG",
        intro: "intro",
        sourceUrl: null,
        archived: false,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      };
      await storage.saveConcept(node);
      await storage.saveConcept({
        ...node,
        id: "n2",
        title: "RAG detail",
      });

      const proposals = [
        {
          id: "hist-link",
          kind: "link" as const,
          summary: "link nodes",
          payload: {
            sourceId: "n1",
            targetId: "n2",
            relationType: "related" as const,
          },
        },
        {
          id: "hist-attach",
          kind: "attach" as const,
          summary: "attach context",
          payload: {
            nodeId: "n1",
            introAppend: " extra",
            sourceUrl: "https://example.com/extra",
          },
        },
      ];

      vi.spyOn(autoCurateModule, "autoCurate").mockReturnValue(proposals);

      const historyBefore = await storage.listGraphHistory();

      const entries = await runAutoCurateAfterIngest("n1", {
        storage,
        profile: DEFAULT_USER_PROFILE,
      });

      expect(entries).toHaveLength(proposals.length);
      expect(entries.map((e) => e.id).sort()).toEqual(
        proposals.map((p) => p.id).sort(),
      );

      const historyAfter = await storage.listGraphHistory();
      expect(historyAfter.length - historyBefore.length).toBe(
        proposals.length,
      );
      for (const proposal of proposals) {
        expect(historyAfter.some((row) => row.id === proposal.id)).toBe(true);
      }
      expect(useGraphHistoryStore.getState().entries).toHaveLength(
        proposals.length,
      );
    } finally {
      cleanup();
    }
  });
});
