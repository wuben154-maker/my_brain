import { describe, expect, it, beforeEach, vi } from "vitest";
import { generateProvisionalCandidates } from "@/agent/provisionalCandidateGenerator";
import { ProvisionalRepository } from "@/storage/provisionalRepository";
import { createTempStorage } from "@/invariants/testStorage";
import { SHOWCASE_GRAPH_SNAPSHOT } from "@/showcase/showcaseFixtures";

describe("provisionalNoPermanentWrite", () => {
  beforeEach(() => {
    new ProvisionalRepository().clear();
  });

  it("AI candidate path does not call permanent graph saveConcept", async () => {
    const { storage, cleanup } = createTempStorage();
    const saveConcept = vi.spyOn(storage, "saveConcept");
    try {
      await storage.init();
      const before = await storage.loadGraph();
      const repo = new ProvisionalRepository();

      generateProvisionalCandidates(
        [
          {
            title: "候选概念 A",
            intro: "AI 建议",
            reason: "briefing overlap",
            confidence: 0.92,
            expiresAt: "2099-01-01T00:00:00.000Z",
            id: "prov-a",
          },
        ],
        { repository: repo },
      );

      expect(repo.list()).toHaveLength(1);
      expect(saveConcept).not.toHaveBeenCalled();
      const after = await storage.loadGraph();
      expect(after.nodes).toHaveLength(before.nodes.length);
    } finally {
      saveConcept.mockRestore();
      cleanup();
    }
  });

  it("export permanent graph excludes provisional ids", async () => {
    const repo = new ProvisionalRepository();
    generateProvisionalCandidates(
      [
        {
          title: "隔离候选",
          intro: "not permanent",
          reason: "harness",
          confidence: 0.5,
          expiresAt: "2099-01-01T00:00:00.000Z",
          id: "prov-only",
        },
      ],
      { repository: repo },
    );
    const permanentIds = new Set(SHOWCASE_GRAPH_SNAPSHOT.nodes.map((node) => node.id));
    for (const candidate of repo.list()) {
      expect(permanentIds.has(candidate.id)).toBe(false);
    }
  });
});
