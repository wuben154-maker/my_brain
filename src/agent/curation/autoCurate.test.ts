import { describe, expect, it } from "vitest";
import type { BrainGraphSnapshot, GraphMutationProposal } from "@/domain/graph";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { autoCurate } from "@/agent/curation/autoCurate";

function graph(snapshot: Partial<BrainGraphSnapshot>): BrainGraphSnapshot {
  return {
    nodes: snapshot.nodes ?? [],
    edges: snapshot.edges ?? [],
  };
}

describe("autoCurate", () => {
  it("links a new node to a similar existing concept", () => {
    const newNode = {
      id: "new-rag",
      title: "RAG 检索增强",
      intro: "new",
      sourceUrl: null,
      archived: false,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };
    const proposals = autoCurate(
      graph({
        nodes: [
          newNode,
          {
            id: "old-rag",
            title: "RAG 检索增强生成",
            intro: "old",
            sourceUrl: null,
            archived: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
      newNode,
      DEFAULT_USER_PROFILE,
      { stale: [] },
    );
    expect(proposals.some((p: GraphMutationProposal) => p.kind === "link")).toBe(
      true,
    );
  });

  it("archives stale nodes but never the new node", () => {
    const newNode = {
      id: "fresh",
      title: "全新概念",
      intro: "n",
      sourceUrl: null,
      archived: false,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };
    const proposals = autoCurate(
      graph({
        nodes: [
          newNode,
          {
            id: "stale",
            title: "过时条目",
            intro: "s",
            sourceUrl: null,
            archived: false,
            createdAt: "2020-01-01T00:00:00.000Z",
            updatedAt: "2020-06-01T00:00:00.000Z",
          },
        ],
      }),
      newNode,
      DEFAULT_USER_PROFILE,
      {
        stale: [
          {
            nodeId: "stale",
            reason: "超过 90 天未更新",
          },
        ],
      },
    );
    expect(
      proposals.some((p: GraphMutationProposal) => p.kind === "archive"),
    ).toBe(true);
    expect(proposals.every((p) => p.kind !== "create")).toBe(true);
  });
});
