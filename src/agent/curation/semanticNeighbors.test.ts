import { describe, expect, it } from "vitest";
import type { BrainGraphSnapshot } from "@/domain/graph";
import { rankSemanticPeers } from "@/agent/curation/semanticNeighbors";
import { createMockEmbeddingProvider } from "@/providers/embedding/mockEmbeddingProvider";

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
): BrainGraphSnapshot["nodes"][number] {
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

describe("rankSemanticPeers", () => {
  it("ranks Retrieval Augmented Generation highly against RAG", async () => {
    const embedder = createMockEmbeddingProvider();
    const anchor = node("rag", "RAG", "retrieval augmented generation basics");
    const ranked = await rankSemanticPeers(
      graph({
        nodes: [
          anchor,
          node("rag-long", "Retrieval Augmented Generation", "canonical intro"),
          node("transformer", "Transformer", "attention architecture"),
        ],
      }),
      anchor,
      embedder,
    );

    const ragLong = ranked.find((entry) => entry.peer.id === "rag-long");
    const transformer = ranked.find((entry) => entry.peer.id === "transformer");
    expect(ragLong).toBeDefined();
    expect(transformer).toBeDefined();
    expect(ragLong!.score).toBeGreaterThanOrEqual(0.82);
    expect(ragLong!.score).toBeGreaterThan(transformer!.score);
    expect(transformer!.score).toBeLessThan(0.82);
  });
});
