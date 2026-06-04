import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";
import { EdgeHoverLabel } from "@/components/brain/EdgeHoverLabel";
import { GraphMinimap, type MinimapNode } from "@/components/brain/GraphMinimap";
import { GraphZoomControls } from "@/components/brain/GraphZoomControls";
import { NodeHoverCard } from "@/components/brain/NodeHoverCard";
import type { RelationType } from "@/domain/graph";
import {
  clusterColorForNodeId,
  graphAccentCyan,
  graphEdgeColor,
  invalidateGraphVisualTokenCache,
  withAlpha,
} from "@/lib/graphVisualTokens";
import { GRAPH_ZOOM_TOPIC_MAX } from "@/lib/memoryLayers";
import { salienceVisualAlpha } from "@/lib/salience";
import { readVisualSnapshotId } from "@/lib/visualSnapshotMode";
import { VISUAL_GRAPH_PINNED_POSITIONS } from "@/lib/visualSnapshotFixtures";
import { useGraphStore } from "@/stores/graphStore";

const HOVER_SCALE = 1.06;
const BASE_RADIUS = 5;
const ACTIVE_RADIUS = 8;
const ARCHIVED_OPACITY = 0.35;
const LINK_DISTANCE_MIN = 36;
const LINK_DISTANCE_MAX = 140;

interface GraphNode extends NodeObject {
  id: string;
  title: string;
  archived: boolean;
  salienceAlpha: number;
  previewGhost?: boolean;
}

interface GraphLink extends LinkObject {
  id: string;
  relationType: string;
}

function nodeVisualState(
  archived: boolean,
  highlighted: boolean,
  selected: boolean,
  hovered: boolean,
): "archived" | "active" | "emphasis" {
  if (archived) {
    return "archived";
  }
  if (highlighted || selected || hovered) {
    return "emphasis";
  }
  return "active";
}

export function BrainGraphView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(
    undefined,
  );
  const [dimensions, setDimensions] = useState({ width: 800, height: 520 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<GraphLink | null>(null);
  const [layerDepth, setLayerDepth] = useState(45);
  const [minimapTick, setMinimapTick] = useState(0);
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );

  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const previewGhostNodes = useGraphStore((state) => state.previewGhostNodes);
  const previewGhostEdges = useGraphStore((state) => state.previewGhostEdges);
  const highlightedNodeIds = useGraphStore((state) => state.highlightedNodeIds);
  const highlightedEdgeIds = useGraphStore(
    (state) => state.highlightedEdgeIds,
  );
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const selectNode = useGraphStore((state) => state.selectNode);

  const activeCount = useMemo(
    () => nodes.filter((node) => !node.archived).length,
    [nodes],
  );
  const archivedCount = nodes.length - activeCount;

  const linkDistance = useMemo(() => {
    const t = layerDepth / 100;
    return LINK_DISTANCE_MIN + (LINK_DISTANCE_MAX - LINK_DISTANCE_MIN) * t;
  }, [layerDepth]);

  const pinGraphLayout = readVisualSnapshotId() === "companion";

  const graphData = useMemo(
    () => ({
      nodes: [
        ...nodes.map((node) => {
          const pinned = pinGraphLayout
            ? VISUAL_GRAPH_PINNED_POSITIONS[node.id]
            : undefined;
          return {
            id: node.id,
            title: node.title,
            archived: node.archived,
            salienceAlpha: salienceVisualAlpha(node),
            ...(pinned ? { fx: pinned.x, fy: pinned.y } : {}),
          };
        }),
        ...previewGhostNodes.map((node) => ({
          id: node.id,
          title: node.title,
          archived: false,
          previewGhost: true,
          salienceAlpha: 1,
        })),
      ],
      links: [
        ...edges.map((edge) => ({
          id: edge.id,
          source: edge.sourceId,
          target: edge.targetId,
          relationType: edge.relationType,
        })),
        ...previewGhostEdges.map((edge) => ({
          id: edge.id,
          source: edge.sourceId,
          target: edge.targetId,
          relationType: edge.relationType,
        })),
      ],
    }),
    [nodes, edges, previewGhostNodes, previewGhostEdges, pinGraphLayout],
  );

  const minimapNodes: MinimapNode[] = useMemo(() => {
    void minimapTick;
    return graphData.nodes
      .map((node) => {
        const position = nodePositionsRef.current.get(node.id);
        if (!position) {
          return null;
        }
        return {
          id: node.id,
          x: position.x,
          y: position.y,
          archived: node.archived,
          color: clusterColorForNodeId(node.id),
        };
      })
      .filter((node): node is MinimapNode => node !== null);
  }, [graphData.nodes, minimapTick]);

  useEffect(() => {
    invalidateGraphVisualTokenCache();
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDimensions({
        width: Math.max(320, Math.floor(width)),
        height: Math.max(320, Math.floor(height)),
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (highlightedNodeIds.length === 0) {
      return;
    }
    if (previewGhostNodes.length > 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      useGraphStore.getState().clearHighlights();
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [highlightedNodeIds, previewGhostNodes.length]);

  useEffect(() => {
    if (graphData.nodes.length === 0) {
      return;
    }
    // Pinned (visual=companion) needs a deterministic frame; the live force layout
    // is fit on `onEngineStop` instead so we never freeze a pre-settle view.
    if (!pinGraphLayout) {
      return;
    }
    const timer = window.setTimeout(() => {
      graphRef.current?.zoom(1.15, 0);
      graphRef.current?.centerAt(0, 20, 0);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [graphData.nodes.length, pinGraphLayout]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }
    const linkForce = graph.d3Force("link");
    if (linkForce && typeof linkForce === "object" && "distance" in linkForce) {
      const force = linkForce as { distance: (value: number) => unknown };
      force.distance(linkDistance);
      graph.d3ReheatSimulation();
    }
  }, [linkDistance, graphData.nodes.length]);

  const handleZoomIn = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }
    graph.zoom(graph.zoom() * 1.2, 150);
  }, []);

  const handleZoomOut = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }
    graph.zoom(graph.zoom() / 1.2, 150);
  }, []);

  const handleReset = useCallback(() => {
    graphRef.current?.zoomToFit(280, 48);
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="brain-graph-view"
      className="graph-canvas-shell relative h-full min-h-[420px] w-full overflow-hidden rounded-md border border-hud bg-bg-base/80"
    >
      <div className="pointer-events-none absolute left-4 top-4 z-[1] font-hud text-label uppercase tracking-hud text-muted">
        大脑星图 · {activeCount} 概念
        {archivedCount > 0 ? ` · ${archivedCount} 归档` : ""} · {edges.length}{" "}
        关联
      </div>

      {graphData.nodes.length === 0 ? (
        <div className="flex h-full items-center justify-center text-body text-muted">
          大脑星图等待第一颗星…
          <br />
          <span className="mt-2 text-caption">
            处理资讯并确认「入库?」后点亮节点
          </span>
        </div>
      ) : (
        <>
          <ForceGraph2D
            ref={graphRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            backgroundColor="rgba(0,0,0,0)"
            enableNodeDrag
            enableZoomInteraction
            enablePanInteraction
            cooldownTicks={80}
            minZoom={0.4}
            maxZoom={3.2}
            onEngineStop={() => {
              setMinimapTick((value) => value + 1);
              // Fit once the simulation settles so we never freeze a half-laid-out
              // (and therefore wildly over-zoomed) view.
              if (!pinGraphLayout) {
                graphRef.current?.zoomToFit(500, 90);
              }
            }}
            onRenderFramePost={() => {
              setMinimapTick((value) => (value + 1) % 240);
            }}
            onNodeHover={(node) => {
              setHoveredNodeId(node ? String(node.id) : null);
              if (node) {
                setHoveredLink(null);
              }
            }}
            onLinkHover={(link) => {
              setHoveredLink(link ? (link as GraphLink) : null);
              if (link) {
                setHoveredNodeId(null);
              }
            }}
            linkColor={(link) => {
              const linkId = String((link as GraphLink).id);
              return highlightedEdgeIds.includes(linkId)
                ? graphAccentCyan()
                : graphEdgeColor();
            }}
            linkWidth={(link) =>
              highlightedEdgeIds.includes(String((link as GraphLink).id))
                ? 2
                : 1
            }
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            nodeLabel="title"
            onNodeClick={(node) => {
              selectNode(String(node.id));
            }}
            nodePointerAreaPaint={(node, color, ctx) => {
              const graphNode = node as GraphNode;
              const emphasis =
                highlightedNodeIds.includes(String(node.id)) ||
                selectedNodeId === String(node.id) ||
                hoveredNodeId === String(node.id);
              const radius =
                (graphNode.archived ? BASE_RADIUS - 1 : BASE_RADIUS) *
                (emphasis ? HOVER_SCALE : 1);
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x ?? 0, node.y ?? 0, radius + 4, 0, 2 * Math.PI);
              ctx.fill();
            }}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const graphNode = node as GraphNode;
              const nodeId = String(node.id);
              if (node.x !== undefined && node.y !== undefined) {
                nodePositionsRef.current.set(nodeId, { x: node.x, y: node.y });
              }
              const isGhost = graphNode.previewGhost === true;
              const visual = nodeVisualState(
                graphNode.archived,
                highlightedNodeIds.includes(nodeId) || isGhost,
                selectedNodeId === nodeId,
                hoveredNodeId === nodeId,
              );
              const emphasis = visual === "emphasis";
              const scale = emphasis ? HOVER_SCALE : 1;
              const baseRadius = graphNode.archived
                ? BASE_RADIUS - 1
                : emphasis
                  ? ACTIVE_RADIUS
                  : BASE_RADIUS;
              const radius = baseRadius * scale;
              const x = node.x ?? 0;
              const y = node.y ?? 0;
              const clusterColor = isGhost
                ? graphAccentCyan()
                : clusterColorForNodeId(nodeId);

              ctx.save();
              const salienceMul = graphNode.salienceAlpha;
              if (graphNode.archived) {
                ctx.globalAlpha = ARCHIVED_OPACITY * salienceMul;
              } else if (isGhost) {
                ctx.globalAlpha = 0.55;
              } else {
                ctx.globalAlpha = salienceMul;
              }

              // Soft radial bloom behind every live node so the starfield glows
              // as a whole, not just on hover. Falls off to fully transparent.
              if (!graphNode.archived) {
                const bloomRadius = radius * (emphasis ? 5.2 : 3.6);
                const bloom = ctx.createRadialGradient(
                  x,
                  y,
                  radius * 0.4,
                  x,
                  y,
                  bloomRadius,
                );
                bloom.addColorStop(0, withAlpha(clusterColor, emphasis ? 0.5 : 0.28));
                bloom.addColorStop(0.6, withAlpha(clusterColor, emphasis ? 0.18 : 0.1));
                bloom.addColorStop(1, withAlpha(clusterColor, 0));
                ctx.beginPath();
                ctx.arc(x, y, bloomRadius, 0, 2 * Math.PI, false);
                ctx.fillStyle = bloom;
                ctx.fill();
              }

              if (emphasis && !graphNode.archived) {
                ctx.beginPath();
                ctx.arc(x, y, radius + 8, 0, 2 * Math.PI, false);
                ctx.fillStyle = withAlpha(graphAccentCyan(), 0.12);
                ctx.fill();
                ctx.shadowColor = clusterColor;
                ctx.shadowBlur = 22;
              } else if (!graphNode.archived) {
                ctx.shadowColor = clusterColor;
                ctx.shadowBlur = 12;
              }

              ctx.beginPath();
              ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
              ctx.fillStyle =
                emphasis && !graphNode.archived ? "#e0f2fe" : clusterColor;
              ctx.fill();
              if (isGhost) {
                ctx.setLineDash([3 / globalScale, 3 / globalScale]);
                ctx.lineWidth = 1.5 / globalScale;
                ctx.strokeStyle = withAlpha(graphAccentCyan(), 0.85);
                ctx.stroke();
                ctx.setLineDash([]);
              }
              ctx.shadowBlur = 0;

              // Tie the label size to the node radius (graph units) so it scales
              // with the graph and never balloons relative to the dot, whatever
              // the current zoom. Hide it only when zoomed far out.
              if (globalScale > GRAPH_ZOOM_TOPIC_MAX) {
                const labelSize = radius * 1.5;
                ctx.font = `500 ${labelSize}px var(--font-sans)`;
                ctx.textBaseline = "middle";
                ctx.fillStyle =
                  graphNode.archived
                    ? "rgba(154, 172, 196, 0.55)"
                    : emphasis
                      ? "#f8fafc"
                      : "#cbd5e1";
                ctx.fillText(graphNode.title, x + radius + labelSize * 0.4, y);
              }
              ctx.restore();
            }}
          />

          {hoveredNodeId ? (
            <NodeHoverCard nodeId={hoveredNodeId} left={16} top={56} />
          ) : null}
          {hoveredLink ? (
            <EdgeHoverLabel
              relationType={hoveredLink.relationType as RelationType}
              left={16}
              top={56}
            />
          ) : null}

          <GraphMinimap nodes={minimapNodes} />
          <GraphZoomControls
            layerDepth={layerDepth}
            onLayerDepthChange={setLayerDepth}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleReset}
          />
        </>
      )}
    </div>
  );
}
