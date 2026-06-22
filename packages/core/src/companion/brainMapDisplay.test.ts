import { describe, expect, it } from "vitest";

import type { GraphChangeRecord, GraphNode } from "../graph/types.js";
import { enrichNodeDisplay } from "./brainMapDisplay.js";

function node(overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id: "node-a",
    concept: "RAG 检索增强",
    intro: "简介",
    sourceLinks: ["https://example.com/rag"],
    archived: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function historyEntry(overrides: Partial<GraphChangeRecord>): GraphChangeRecord {
  const before = { nodes: [node()], edges: [] };
  const after = {
    nodes: [node({ intro: "更新后简介" })],
    edges: [{ id: "edge-1", fromId: "node-a", toId: "node-b", relation: "related_to" }],
  };
  return {
    id: "change-1",
    kind: "edge_created",
    summary: "自动关联相关概念",
    before,
    after,
    createdAt: "2026-01-02T00:00:00.000Z",
    undone: false,
    ...overrides,
  };
}

describe("enrichNodeDisplay", () => {
  it("returns source link, active state, and curation reason from history", () => {
    const enrichment = enrichNodeDisplay(node(), [
      historyEntry({ kind: "node_created", summary: "入库「RAG 检索增强」" }),
      historyEntry({ kind: "edge_created", summary: "自动关联相关概念" }),
    ]);

    expect(enrichment.source).toBe("https://example.com/rag");
    expect(enrichment.state).toBe("active");
    expect(enrichment.recentChange).toBe("自动关联相关概念");
    expect(enrichment.curationReason).toBe("自动关联相关概念");
  });

  it("prefers ingestSource over sourceLinks", () => {
    const enrichment = enrichNodeDisplay(
      node({ ingestSource: "companion-chat:session-1", sourceLinks: ["https://example.com"] }),
      [],
    );

    expect(enrichment.source).toBe("companion-chat:session-1");
  });

  it("marks archived nodes and surfaces merge curation reason", () => {
    const archivedNode = node({ archived: true });
    const enrichment = enrichNodeDisplay(archivedNode, [
      historyEntry({
        kind: "auto_curate_merge",
        summary: "自动合并重复概念",
        after: { nodes: [archivedNode], edges: [] },
      }),
    ]);

    expect(enrichment.state).toBe("archived");
    expect(enrichment.curationReason).toBe("自动合并重复概念");
  });

  it("ignores undone history entries", () => {
    const enrichment = enrichNodeDisplay(node(), [
      historyEntry({ summary: "已撤销的变更", undone: true }),
    ]);

    expect(enrichment.recentChange).toBeNull();
    expect(enrichment.curationReason).toBeNull();
  });
});
