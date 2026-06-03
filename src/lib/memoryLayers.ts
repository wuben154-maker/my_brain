import type { ConceptNode } from "@/domain/graph";
import type {
  MemoryProvider,
  MemoryItem,
  RecalledMemory,
} from "@/providers/memory/types";

export type MemoryLayer = "topic" | "concept" | "fact";

/** Matches BrainGraphView label visibility (`globalScale > 0.45`) — G1/N3 share this. */
export const GRAPH_ZOOM_TOPIC_MAX = 0.45;
export const GRAPH_ZOOM_CONCEPT_MAX = 1.2;

export interface CoarseToFineRecallOptions {
  maxPerLayer?: Partial<Record<MemoryLayer, number>>;
}

const DEFAULT_MAX_PER_LAYER: Record<MemoryLayer, number> = {
  topic: 2,
  concept: 0,
  fact: 5,
};

export function layerOfMemoryItem(item: MemoryItem): MemoryLayer {
  return item.kind === "episode" ? "topic" : "fact";
}

export function layerOfConceptNode(node: ConceptNode): MemoryLayer {
  void node;
  return "concept";
}

export function layerOf(item: MemoryItem | ConceptNode): MemoryLayer {
  if ("kind" in item) {
    return layerOfMemoryItem(item);
  }
  return layerOfConceptNode(item);
}

export type LayeredBucket<T> = Record<MemoryLayer, T[]>;

export function emptyLayerBuckets<T>(): LayeredBucket<T> {
  return { topic: [], concept: [], fact: [] };
}

export function groupRecalledByLayer(
  recalled: RecalledMemory[],
): LayeredBucket<RecalledMemory> {
  const buckets = emptyLayerBuckets<RecalledMemory>();
  for (const entry of recalled) {
    buckets[layerOfMemoryItem(entry.item)].push(entry);
  }
  return buckets;
}

export function groupConceptNodesByLayer(
  nodes: ConceptNode[],
): LayeredBucket<ConceptNode> {
  const buckets = emptyLayerBuckets<ConceptNode>();
  for (const node of nodes) {
    if (node.archived) {
      continue;
    }
    buckets[layerOfConceptNode(node)].push(node);
  }
  return buckets;
}

/** Spec alias: group recalled rows or concept nodes by `MemoryLayer`. */
export function groupByLayer(
  recalled: RecalledMemory[],
): LayeredBucket<RecalledMemory>;
export function groupByLayer(nodes: ConceptNode[]): LayeredBucket<ConceptNode>;
export function groupByLayer(
  items: RecalledMemory[] | ConceptNode[],
): LayeredBucket<RecalledMemory | ConceptNode> {
  if (items.length === 0) {
    return emptyLayerBuckets();
  }
  const head = items[0];
  if (head && "item" in head && "score" in head) {
    return groupRecalledByLayer(items as RecalledMemory[]);
  }
  return groupConceptNodesByLayer(items as ConceptNode[]);
}

export function graphZoomToMemoryLayer(globalScale: number): MemoryLayer {
  if (globalScale <= GRAPH_ZOOM_TOPIC_MAX) {
    return "topic";
  }
  if (globalScale < GRAPH_ZOOM_CONCEPT_MAX) {
    return "concept";
  }
  return "fact";
}

function recallKey(entry: RecalledMemory): string {
  return entry.item.id ?? entry.item.text;
}

export function dedupeRecalled(recalled: RecalledMemory[]): RecalledMemory[] {
  const seen = new Set<string>();
  const merged: RecalledMemory[] = [];
  for (const entry of recalled) {
    const key = recallKey(entry);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(entry);
  }
  return merged;
}

/**
 * Two-pass recall: topic (episode) coarse pass, then fact fine pass scoped by coarse hits.
 * Falls back to a single pass when coarse is empty or provider fails.
 */
export async function coarseToFineRecall(
  memory: MemoryProvider | undefined,
  query: string,
  options: CoarseToFineRecallOptions = {},
): Promise<RecalledMemory[]> {
  const trimmed = query.trim();
  if (!memory || !trimmed) {
    return [];
  }

  const maxPerLayer = { ...DEFAULT_MAX_PER_LAYER, ...options.maxPerLayer };

  try {
    const topicHits = await memory.recall({
      query: trimmed,
      topK: maxPerLayer.topic,
      kinds: ["episode"],
    });

    if (topicHits.length === 0) {
      return await memory.recall({
        query: trimmed,
        topK: maxPerLayer.fact + maxPerLayer.topic,
      });
    }

    const refineQuery = `${trimmed} ${topicHits
      .map((hit) => hit.item.text)
      .join(" ")
      .slice(0, 240)}`.trim();

    const fineHits = await memory.recall({
      query: refineQuery,
      topK: maxPerLayer.fact,
      kinds: ["fact"],
    });

    return dedupeRecalled([...topicHits, ...fineHits]);
  } catch {
    return [];
  }
}
