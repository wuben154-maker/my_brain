import { useGraphStore } from "@/stores/graphStore";

interface NodeHoverCardProps {
  nodeId: string;
  left: number;
  top: number;
}

/** Brief concept intro while hovering a graph node (V6). */
export function NodeHoverCard({ nodeId, left, top }: NodeHoverCardProps) {
  const node = useGraphStore((state) =>
    state.nodes.find((item) => item.id === nodeId),
  );

  if (!node) {
    return null;
  }

  const intro =
    node.intro.trim().length > 0 ? node.intro : "暂无简介，入库后可补充。";

  return (
    <div
      data-testid="node-hover-card"
      className="pointer-events-none absolute z-20 max-w-xs rounded-md border border-hud bg-bg-elevated/95 px-3 py-2 shadow-lg backdrop-blur-sm"
      style={{ left: Math.max(8, left), top: Math.max(8, top) }}
    >
      <p className="font-hud text-label uppercase tracking-hud text-accent-cyan">
        {node.title}
      </p>
      <p className="mt-1 text-caption leading-snug text-secondary">{intro}</p>
    </div>
  );
}
