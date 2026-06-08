import type { EmbeddingProvider } from "./types";

const EMBED_DIM = 64;

const ML_CLUSTER_TOKENS = new Set([
  "rag",
  "retrieval",
  "augmented",
  "generation",
  "transformer",
  "attention",
  "model",
  "vector",
  "embedding",
  "architecture",
]);

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

/** Expand test-friendly aliases so acronym titles align with long-form concepts. */
function expandAcronyms(text: string): string {
  return text.replace(/\brag\b/gu, "retrieval augmented generation");
}

function tokenize(text: string): string[] {
  return expandAcronyms(normalizeText(text))
    .split(/[^\p{L}\p{N}]+/u)
    .filter((part) => part.length > 0);
}

function l2Normalize(vector: number[]): number[] {
  let norm = 0;
  for (const value of vector) {
    norm += value * value;
  }
  norm = Math.sqrt(norm);
  if (norm === 0) {
    return vector.map(() => 0);
  }
  return vector.map((value) => value / norm);
}

function addToken(vector: number[], token: string, weight: number): void {
  const hash = stableHash(token);
  const index = hash % EMBED_DIM;
  const sign = (hash & 1) === 0 ? 1 : -1;
  vector[index] += sign * weight;
}

function embedText(text: string): number[] {
  const vector = Array.from({ length: EMBED_DIM }, () => 0);
  const normalized = normalizeText(text);
  const expanded = expandAcronyms(normalized);
  const tokens = tokenize(text);
  let mlHits = 0;

  for (const token of tokens) {
    addToken(vector, token, 1 + token.length * 0.1);
    if (ML_CLUSTER_TOKENS.has(token)) {
      mlHits += 1;
    }
  }

  if (mlHits > 0) {
    addToken(vector, "ml-cluster", mlHits * 0.55);
  }

  for (let i = 0; i < tokens.length - 1; i += 1) {
    addToken(vector, `${tokens[i]} ${tokens[i + 1]}`, 1.5);
  }

  const isRagConcept =
    /\brag\b/u.test(normalized) ||
    expanded.includes("retrieval augmented generation");
  const isTransformerConcept = tokens.some(
    (token) => token === "transformer" || token === "attention",
  );

  if (isRagConcept) {
    addToken(vector, "concept:rag", 5);
    addToken(vector, "retrieval augmented generation", 4);
    addToken(vector, "bridge:transformer-rag", 11);
  }

  if (isTransformerConcept) {
    addToken(vector, "bridge:transformer-rag", 11);
  }

  return l2Normalize(vector);
}

/** Deterministic hash(title+intro) → fixed-dim L2-normalized vectors for tests. */
export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly modelId = "mock-embedding-v1";

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => embedText(text));
  }
}

export function createMockEmbeddingProvider(): EmbeddingProvider {
  return new MockEmbeddingProvider();
}
