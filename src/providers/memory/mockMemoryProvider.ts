import type {
  MemoryItem,
  MemoryProvider,
  RecallQuery,
  RecalledMemory,
} from "./types";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((part) => part.length > 1);
}

function overlapScore(query: string, text: string): number {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) {
    return 0;
  }
  const textTokens = tokenize(text);
  let hits = 0;
  for (const token of textTokens) {
    if (queryTokens.has(token)) {
      hits += 1;
    }
  }
  return hits / queryTokens.size;
}

/** In-memory recall layer for tests and offline dev — no sidecar required. */
export class MockMemoryProvider implements MemoryProvider {
  private items: MemoryItem[] = [];

  async remember(items: MemoryItem[]): Promise<void> {
    for (const item of items) {
      if (!item.text.trim()) {
        continue;
      }
      this.items.push({
        ...item,
        id: item.id ?? `mock-${this.items.length + 1}`,
      });
    }
  }

  async recall(query: RecallQuery): Promise<RecalledMemory[]> {
    const topK = query.topK ?? 5;
    const allowedKinds = query.kinds?.length
      ? new Set(query.kinds)
      : null;

    const scored = this.items
      .filter((item) => !allowedKinds || allowedKinds.has(item.kind))
      .map((item) => ({
        item,
        score: overlapScore(query.query, item.text),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || b.item.timestamp - a.item.timestamp)
      .slice(0, topK);

    return scored;
  }

  async health(): Promise<{ ok: boolean; detail?: string }> {
    return { ok: true };
  }

  /** Test helper — not part of MemoryProvider contract. */
  size(): number {
    return this.items.length;
  }
}

export function createMockMemoryProvider(): MemoryProvider {
  return new MockMemoryProvider();
}
