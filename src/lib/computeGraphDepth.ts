/** Longest BFS tier across the undirected graph (图谱深度 N 层). */
export function computeGraphDepth(
  nodeIds: string[],
  edges: { sourceId: string; targetId: string }[],
): number {
  if (nodeIds.length === 0) {
    return 0;
  }
  const adjacency = new Map<string, string[]>();
  for (const id of nodeIds) {
    adjacency.set(id, []);
  }
  for (const edge of edges) {
    adjacency.get(edge.sourceId)?.push(edge.targetId);
    adjacency.get(edge.targetId)?.push(edge.sourceId);
  }
  const degree = (id: string) => adjacency.get(id)?.length ?? 0;
  const root = [...nodeIds].sort((a, b) => degree(b) - degree(a))[0]!;

  const visited = new Set<string>([root]);
  let frontier = [root];
  let depth = 1;
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighbor of adjacency.get(id) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    if (next.length > 0) {
      depth += 1;
    }
    frontier = next;
  }
  return depth;
}
