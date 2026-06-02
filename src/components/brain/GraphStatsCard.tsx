import { useMemo } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useGraphStore } from "@/stores/graphStore";

/** Longest BFS tier across the undirected graph (图谱深度 N 层). */
function computeGraphDepth(
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

/** Bottom-left graph stats panel (DESIGN.md §7 GlassCard). Live store counts. */
export function GraphStatsCard() {
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);

  const stats = useMemo(() => {
    const active = nodes.filter((node) => !node.archived);
    const sources = nodes.filter((node) => node.sourceUrl).length;
    const depth = computeGraphDepth(
      active.map((node) => node.id),
      edges.map((edge) => ({ sourceId: edge.sourceId, targetId: edge.targetId })),
    );
    return [
      { label: "概念节点", value: active.length.toLocaleString() },
      { label: "连接关系", value: edges.length.toLocaleString() },
      { label: "文档资源", value: sources.toLocaleString() },
      { label: "图谱深度", value: `${depth} 层` },
    ];
  }, [nodes, edges]);

  return (
    <GlassCard
      dense
      data-testid="graph-stats-card"
      className="pointer-events-none absolute bottom-4 left-4 z-[2] w-44"
    >
      <p className="font-hud text-label uppercase tracking-hud text-muted">
        图谱统计
      </p>
      <dl className="mt-2 space-y-1.5">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-baseline justify-between">
            <dt className="text-caption text-secondary">{stat.label}</dt>
            <dd className="font-hud text-body text-accent-cyan">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </GlassCard>
  );
}
