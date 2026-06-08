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

      vi.spyOn(autoCurateModule, "autoCurate").mockResolvedValue([
        {
          id: "p-link",
          kind: "link",
          summary: "link two",
          reasonCode: "overlap_title",
          reasonDetail: "标题重叠",
          affectedNodeIds: ["n1", "n2"],
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

  it("records overlap_semantic history when semantic auto-curate applies", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      const ragAlias = {
        id: "rag-alias",
        title: "RAG",
        intro: "retrieval augmented generation basics",
        sourceUrl: null,
        archived: false,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      };
      await storage.saveConcept(ragAlias);
      await storage.saveConcept({
        ...ragAlias,
        id: "rag-canonical",
        title: "Retrieval Augmented Generation",
        intro: "canonical intro",
      });

      const entries = await runAutoCurateAfterIngest("rag-alias", {
        storage,
        profile: DEFAULT_USER_PROFILE,
      });

      expect(entries.length).toBeGreaterThan(0);
      expect(
        entries.some((entry) => entry.reasonCode === "overlap_semantic"),
      ).toBe(true);
      const history = await storage.listGraphHistory();
      expect(
        history.some((row) => row.reasonCode === "overlap_semantic"),
      ).toBe(true);
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
          reasonCode: "overlap_title" as const,
          reasonDetail: "标题重叠",
          affectedNodeIds: ["n1", "n2"],
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
          reasonCode: "ingest_link" as const,
          reasonDetail: "入库附加上下文",
          affectedNodeIds: ["n1"],
          payload: {
            nodeId: "n1",
            introAppend: " extra",
            sourceUrl: "https://example.com/extra",
          },
        },
      ];

      vi.spyOn(autoCurateModule, "autoCurate").mockResolvedValue(proposals);

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
