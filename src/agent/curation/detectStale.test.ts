import { describe, expect, it } from "vitest";
import type { BrainGraphSnapshot } from "@/domain/graph";
import { detectStaleNodes } from "@/agent/curation/detectStale";

const now = new Date("2026-06-01T12:00:00.000Z");

function graph(snapshot: Partial<BrainGraphSnapshot>): BrainGraphSnapshot {
  return {
    nodes: snapshot.nodes ?? [],
    edges: snapshot.edges ?? [],
  };
}

describe("detectStaleNodes (C2)", () => {
  it("flags nodes stale by updatedAt", () => {
    const findings = detectStaleNodes(
      graph({
        nodes: [
          {
            id: "old",
            title: "旧概念",
            intro: "i",
            sourceUrl: null,
            archived: false,
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-06-01T00:00:00.000Z",
          },
        ],
      }),
      now,
      180,
    );
    expect(findings.some((f) => f.nodeId === "old")).toBe(true);
  });

  it("flags nodes replaced by replaces edges with migrate target", () => {
    const findings = detectStaleNodes(
      graph({
        nodes: [
          {
            id: "legacy",
            title: "旧 RAG",
            intro: "i",
            sourceUrl: null,
            archived: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z",
          },
          {
            id: "next",
            title: "新 RAG",
            intro: "i",
            sourceUrl: null,
            archived: false,
            createdAt: "2026-05-20T00:00:00.000Z",
            updatedAt: "2026-05-25T00:00:00.000Z",
          },
        ],
        edges: [
          {
            id: "e1",
            sourceId: "next",
            targetId: "legacy",
            relationType: "replaces",
          },
        ],
      }),
      now,
      365,
    );
    const hit = findings.find((f) => f.nodeId === "legacy");
    expect(hit?.migrateToNodeId).toBe("next");
  });

  it("flags highly overlapping titles toward the newer node", () => {
    const findings = detectStaleNodes(
      graph({
        nodes: [
          {
            id: "a",
            title: "向量检索 RAG",
            intro: "i",
            sourceUrl: null,
            archived: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-15T00:00:00.000Z",
          },
          {
            id: "b",
            title: "RAG 向量检索",
            intro: "i",
            sourceUrl: null,
            archived: false,
            createdAt: "2026-02-01T00:00:00.000Z",
            updatedAt: "2026-05-20T00:00:00.000Z",
          },
        ],
      }),
      now,
      999,
    );
    expect(findings.some((f) => f.nodeId === "a" && f.migrateToNodeId === "b")).toBe(
      true,
    );
  });
});
