import { useMemo } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { computeGraphDepth } from "@/lib/computeGraphDepth";
import { useGraphStore } from "@/stores/graphStore";

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
    const rows = [
      { label: "概念节点", value: active.length.toLocaleString() },
      { label: "连接关系", value: edges.length.toLocaleString() },
    ];
    if (sources > 0) {
      rows.push({ label: "文档资源", value: sources.toLocaleString() });
    }
    rows.push({ label: "图谱深度", value: `${depth} 层` });
    return rows;
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
