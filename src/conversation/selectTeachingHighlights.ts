import type { BrainGraphSnapshot } from "@/domain/graph";
import { visibleGraph } from "@/lib/graphMutations";

/** Pick graph nodes whose title matches the teaching topic (V6 consumes highlights). */
export function selectTeachingHighlights(
  graph: BrainGraphSnapshot,
  topic: string,
): string[] {
  const trimmed = topic.trim().toLowerCase();
  if (!trimmed) {
    return [];
  }
  const { nodes } = visibleGraph(graph);
  const matches = nodes.filter((node) => {
    const title = node.title.toLowerCase();
    if (title.includes(trimmed)) {
      return true;
    }
    // Avoid spurious hits like topic "topic" matching node title "c".
    return trimmed.includes(title) && title.length >= 3;
  });
  if (matches.length > 0) {
    return matches.slice(0, 3).map((node) => node.id);
  }
  if (nodes.length > 0) {
    return [nodes[0]!.id];
  }
  return [];
}