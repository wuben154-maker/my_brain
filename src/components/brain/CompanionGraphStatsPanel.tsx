import { useMemo } from "react";
import { computeGraphDepth } from "@/lib/computeGraphDepth";
import { useGraphStore } from "@/stores/graphStore";

/** Graph stats card stacked above the minimap — live store counts only. */
export function CompanionGraphStatsPanel() {
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);

  const rows = useMemo(() => {
    const activeNodes = nodes.filter((node) => !node.archived);
    const sourceCount = nodes.filter((node) => node.sourceUrl).length;
    const depth = computeGraphDepth(
      activeNodes.map((node) => node.id),
      edges.map((edge) => ({ sourceId: edge.sourceId, targetId: edge.targetId })),
    );

    const stats: [string, string][] = [
      ["概念节点", activeNodes.length.toLocaleString()],
      ["连接关系", edges.length.toLocaleString()],
    ];

    if (sourceCount > 0) {
      stats.push(["文档资源", sourceCount.toLocaleString()]);
    }

    stats.push(["图谱深度", `${depth}层`]);
    return stats;
  }, [nodes, edges]);

  return (
    <div className="glass-card w-44 shrink-0 p-3">
      <p className="font-hud text-label uppercase tracking-hud text-accent-cyan">
        图谱统计
      </p>
      <dl className="mt-2 space-y-1.5 text-caption">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-2">
            <dt className="text-muted">{label}</dt>
            <dd className="font-hud text-secondary">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
