import { describe, expect, it } from "vitest";
import {
  attemptAutoPromoteByConfidence,
  promoteProvisionalToGraph,
} from "@/lib/promoteProvisionalToGraph";
import { createProvisionalNode } from "@/domain/provisional/provisionalNode";
import { SHOWCASE_GRAPH_SNAPSHOT, SHOWCASE_NOW } from "@/showcase/showcaseFixtures";
import { createTempStorage } from "@/invariants/testStorage";

describe("promoteProvisional", () => {
  it("only user confirm creates permanent node", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      const candidate = createProvisionalNode({
        id: "prov-promote-1",
        title: "晋升概念",
        intro: "用户确认后入库",
        sourceRefs: [],
        reason: "harness",
        confidence: 0.99,
        expiresAt: "2099-01-01T00:00:00.000Z",
        createdAt: SHOWCASE_NOW,
      });

      const blocked = await promoteProvisionalToGraph(
        storage,
        SHOWCASE_GRAPH_SNAPSHOT,
        { candidate, userConfirmed: false },
      );
      expect(blocked.ok).toBe(false);

      const promoted = await promoteProvisionalToGraph(
        storage,
        SHOWCASE_GRAPH_SNAPSHOT,
        { candidate, userConfirmed: true, nowIso: SHOWCASE_NOW },
      );
      expect(promoted.ok).toBe(true);

      const graph = await storage.loadGraph();
      expect(graph.nodes.some((node) => node.id === "prov-promote-1")).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("high-confidence auto promote path is forbidden", () => {
    const candidate = createProvisionalNode({
      id: "prov-auto",
      title: "高置信候选",
      intro: "",
      sourceRefs: [],
      reason: "strict rule",
      confidence: 0.99,
      expiresAt: "2099-01-01T00:00:00.000Z",
      createdAt: SHOWCASE_NOW,
    });
    const result = attemptAutoPromoteByConfidence(candidate, 0.8);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("auto_promote_forbidden");
  });
});
