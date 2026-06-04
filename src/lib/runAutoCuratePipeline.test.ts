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
});
