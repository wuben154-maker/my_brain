import type { BrainGraphSnapshot, ConceptNode } from "@/domain/graph";
import type { EmbeddingProvider } from "@/providers/embedding/types";

export interface SemanticPeerRank {
  peer: ConceptNode;
  score: number;
}

function nodeEmbeddingText(node: ConceptNode): string {
  return `${node.title}\n${node.intro}`;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
  }
  return dot;
}

export async function rankSemanticPeers(
  graph: BrainGraphSnapshot,
  anchor: ConceptNode,
  embedder: EmbeddingProvider,
  opts?: { topK?: number; minScore?: number },
): Promise<SemanticPeerRank[]> {
  const peers = graph.nodes.filter(
    (node) => !node.archived && node.id !== anchor.id,
  );
  if (peers.length === 0) {
    return [];
  }

  const texts = [nodeEmbeddingText(anchor), ...peers.map(nodeEmbeddingText)];
  const vectors = await embedder.embed(texts);
  const anchorVector = vectors[0];
  const minScore = opts?.minScore ?? 0;
  const topK = opts?.topK ?? peers.length;

  const ranked = peers
    .map((peer, index) => ({
      peer,
      score: cosineSimilarity(anchorVector, vectors[index + 1]),
    }))
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return ranked;
}
