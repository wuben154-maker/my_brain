import { useMemo, useRef } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";
import { useGraphStore } from "@/stores/graphStore";

interface GraphNode extends NodeObject {
  id: string;
  title: string;
}

interface GraphLink extends LinkObject {
  relationType: string;
}

export function BrainGraphView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(
    undefined,
  );
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const highlightedNodeIds = useGraphStore(
    (state) => state.highlightedNodeIds,
  );

  const graphData = useMemo(
    () => ({
      nodes: nodes.map((node) => ({
        id: node.id,
        title: node.title,
      })),
      links: edges.map((edge) => ({
        source: edge.sourceId,
        target: edge.targetId,
        relationType: edge.relationType,
      })),
    }),
    [nodes, edges],
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-[420px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40"
    >
      {graphData.nodes.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          大脑星图等待第一颗星…
        </div>
      ) : (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          backgroundColor="rgba(0,0,0,0)"
          nodeLabel="title"
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const active = highlightedNodeIds.includes(String(node.id));
            const radius = active ? 7 : 5;
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = active ? "#93c5fd" : "#3b82f6";
            ctx.fill();
            if (globalScale > 1.2) {
              ctx.font = `${10 / globalScale}px sans-serif`;
              ctx.fillStyle = "#e2e8f0";
              ctx.fillText(
                (node as GraphNode).title,
                (node.x ?? 0) + 8,
                (node.y ?? 0) + 3,
              );
            }
          }}
        />
      )}
    </div>
  );
}
