import { describe, expect, it } from "vitest";
import type { BrainGraphSnapshot, ConceptNode } from "@/domain/graph";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { autoCurate, type AutoCurateProposal } from "@/agent/curation/autoCurate";

function graph(snapshot: Partial<BrainGraphSnapshot>): BrainGraphSnapshot {
  return {
    nodes: snapshot.nodes ?? [],
    edges: snapshot.edges ?? [],
  };
}

function node(
  id: string,
  title: string,
  intro = "",
): ConceptNode {
  return {
    id,
    title,
    intro,
    sourceUrl: null,
    archived: false,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };
}

describe("autoCurate", () => {
  it("links a new node to a similar existing concept via title overlap", async () => {
    const newNode = node("new-vectordb", "向量数据库 入门", "new");
    const proposals = await autoCurate(
      graph({
        nodes: [newNode, node("old-vectordb", "向量数据库 基础", "old")],
      }),
      newNode,
      DEFAULT_USER_PROFILE,
      { stale: [] },
    );
    expect(proposals.some((p: AutoCurateProposal) => p.kind === "link")).toBe(
      true,
    );
    expect(proposals.some((p) => p.kind === "merge")).toBe(false);
    expect(proposals.every((p) => p.kind !== "create")).toBe(true);
    const link = proposals.find((p) => p.kind === "link");
    expect(link?.reasonCode).toBe("overlap_title");
    expect(link?.affectedNodeIds).toEqual(["new-vectordb", "old-vectordb"]);
  });

  it("merges a new node into a near-duplicate peer without creating nodes", async () => {
    const sharedTitle = "RAG 检索增强";
    const newNode = {
      id: "new-rag-dup",
      title: sharedTitle,
      intro: "new intro",
      sourceUrl: null,
      archived: false,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };
    const proposals = await autoCurate(
      graph({
        nodes: [
          newNode,
          {
            id: "canonical-rag",
            title: sharedTitle,
            intro: "canonical",
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
    const merge = proposals.find((p) => p.kind === "merge");
    expect(merge).toBeDefined();
    expect(merge?.payload).toMatchObject({
      sourceNodeId: "new-rag-dup",
      targetNodeId: "canonical-rag",
    });
    expect(merge?.reasonCode).toBe("overlap_title");
    expect(merge?.affectedNodeIds).toEqual(["new-rag-dup", "canonical-rag"]);
    expect(proposals.every((p) => p.kind !== "create")).toBe(true);
  });

  it("merges RAG alias into Retrieval Augmented Generation via semantic overlap", async () => {
    const newNode = node(
      "new-rag-alias",
      "RAG",
      "retrieval augmented generation basics",
    );
    const proposals = await autoCurate(
      graph({
        nodes: [
          newNode,
          node(
            "canonical-rag-long",
            "Retrieval Augmented Generation",
            "canonical intro",
          ),
        ],
      }),
      newNode,
      DEFAULT_USER_PROFILE,
      { stale: [] },
    );

    const merge = proposals.find((p) => p.kind === "merge");
    expect(merge).toBeDefined();
    expect(merge?.reasonCode).toBe("overlap_semantic");
    expect(merge?.payload).toMatchObject({
      sourceNodeId: "new-rag-alias",
      targetNodeId: "canonical-rag-long",
    });
    expect(merge?.reasonDetail).toMatch(/语义相似 \d+\.\d{2}/);
    expect(proposals.every((p) => p.kind !== "create")).toBe(true);
  });

  it("links related Transformer to RAG without merging", async () => {
    const newNode = node("new-transformer", "Transformer", "attention architecture");
    const proposals = await autoCurate(
      graph({
        nodes: [
          newNode,
          node("canonical-rag", "RAG", "retrieval augmented generation"),
          node("other", "Unrelated Topic", "something else entirely"),
        ],
      }),
      newNode,
      DEFAULT_USER_PROFILE,
      { stale: [] },
    );

    expect(proposals.some((p) => p.kind === "merge")).toBe(false);
    const link = proposals.find((p) => p.kind === "link");
    expect(link).toBeDefined();
    expect(link?.reasonCode).toBe("overlap_semantic");
    expect(link?.payload).toMatchObject({
      sourceId: "new-transformer",
      targetId: "canonical-rag",
    });
    expect(link?.reasonDetail).toMatch(/语义相似 \d+\.\d{2}/);
    expect(proposals.every((p) => p.kind !== "create")).toBe(true);
  });

  it("archives stale nodes but never the new node", async () => {
    const newNode = {
      id: "fresh",
      title: "全新概念",
      intro: "n",
      sourceUrl: null,
      archived: false,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };
    const proposals = await autoCurate(
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
      proposals.some((p: AutoCurateProposal) => p.kind === "archive"),
    ).toBe(true);
    expect(proposals.every((p) => p.kind !== "create")).toBe(true);
    const archive = proposals.find((p) => p.kind === "archive");
    expect(archive?.reasonCode).toBe("stale");
    expect(archive?.reasonDetail).toBe("超过 90 天未更新");
    expect(archive?.affectedNodeIds).toEqual(["stale"]);
  });

  it("never creates Source graph nodes", async () => {
    const newNode = node("fresh-source-guard", "全新概念", "n");
    const proposals = await autoCurate(
      graph({ nodes: [newNode] }),
      newNode,
      DEFAULT_USER_PROFILE,
      { stale: [] },
    );
    expect(proposals.every((p) => p.kind !== "create")).toBe(true);
    expect(proposals.every((p) => p.payload?.nodeKind !== "source")).toBe(true);
  });
});
