import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-3d";
import { EdgeHoverLabel } from "@/components/brain/EdgeHoverLabel";
import { GraphZoomControls } from "@/components/brain/GraphZoomControls";
import { NodeHoverCard } from "@/components/brain/NodeHoverCard";
import type { RelationType } from "@/domain/graph";
import {
  clusterColorForNodeId,
  graphAccentCyan,
  graphEdgeColor,
  invalidateGraphVisualTokenCache,
} from "@/lib/graphVisualTokens";
import { readVisualSnapshotId } from "@/lib/visualSnapshotMode";
import { VISUAL_GRAPH_PINNED_POSITIONS } from "@/lib/visualSnapshotFixtures";
import { useGraphStore } from "@/stores/graphStore";

const LINK_DISTANCE_MIN = 36;
const LINK_DISTANCE_MAX = 140;

interface GraphNode extends NodeObject {
  id: string;
  title: string;
  archived: boolean;
  previewGhost?: boolean;
}

interface GraphLink extends LinkObject {
  id: string;
  relationType: string;
}

export function BrainGraph3DView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(
    undefined,
  );
  const [dimensions, setDimensions] = useState({ width: 800, height: 520 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<GraphLink | null>(null);
  const [layerDepth, setLayerDepth] = useState(45);
  const [cameraDistance, setCameraDistance] = useState(420);

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

  const visualId = readVisualSnapshotId();
  const pinGraphLayout =
    visualId === "companion-main" ||
    visualId === "companion" ||
    visualId === "main";

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
            ...(pinned
              ? { fx: pinned.x, fy: pinned.y, fz: 0 }
              : {}),
          };
        }),
        ...previewGhostNodes.map((node) => ({
          id: node.id,
          title: node.title,
          archived: false,
          previewGhost: true,
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

  const nodeEmphasis = useCallback(
    (nodeId: string, archived: boolean, previewGhost?: boolean) => {
      if (archived) {
        return false;
      }
      return (
        previewGhost === true ||
        highlightedNodeIds.includes(nodeId) ||
        selectedNodeId === nodeId ||
        hoveredNodeId === nodeId
      );
    },
    [highlightedNodeIds, selectedNodeId, hoveredNodeId],
  );

  const handleZoomIn = useCallback(() => {
    const next = cameraDistance * 0.85;
    setCameraDistance(next);
    graphRef.current?.cameraPosition({ z: next }, undefined, 150);
  }, [cameraDistance]);

  const handleZoomOut = useCallback(() => {
    const next = cameraDistance * 1.15;
    setCameraDistance(next);
    graphRef.current?.cameraPosition({ z: next }, undefined, 150);
  }, [cameraDistance]);

  const handleReset = useCallback(() => {
    graphRef.current?.zoomToFit(400, 80);
    setCameraDistance(420);
  }, []);

  return (
    <div
      ref={containerRef}
      className="graph-canvas-shell relative h-full min-h-[420px] w-full overflow-hidden rounded-md border border-hud bg-bg-base/80"
      data-testid="brain-graph-3d"
    >
      <div className="pointer-events-none absolute left-4 top-4 z-[1] font-hud text-label uppercase tracking-hud text-muted">
        大脑星图 · 3D · {activeCount} 概念
        {archivedCount > 0 ? ` · ${archivedCount} 归档` : ""} · {edges.length}{" "}
        关联
      </div>

      {graphData.nodes.length === 0 ? (
        <div className="flex h-full items-center justify-center text-body text-muted">
          大脑星图等待第一颗星…
        </div>
      ) : (
        <>
          <ForceGraph3D
            ref={graphRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            backgroundColor="rgba(0,0,0,0)"
            showNavInfo={false}
            controlType="orbit"
            cooldownTicks={80}
            enableNodeDrag
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
            onEngineStop={() => {
              if (!pinGraphLayout) {
                graphRef.current?.zoomToFit(500, 90);
                setCameraDistance(420);
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
                ? 1.2
                : 0.4
            }
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
            linkOpacity={0.65}
            nodeLabel="title"
            nodeVal={(node) => {
              const graphNode = node as GraphNode;
              const emphasis = nodeEmphasis(
                String(node.id),
                graphNode.archived,
                graphNode.previewGhost,
              );
              if (graphNode.archived) {
                return 0.7;
              }
              return emphasis ? 2.4 : 1.2;
            }}
            nodeColor={(node) => {
              const graphNode = node as GraphNode;
              const nodeId = String(node.id);
              const emphasis = nodeEmphasis(
                nodeId,
                graphNode.archived,
                graphNode.previewGhost,
              );
              if (graphNode.archived) {
                return "#64748b";
              }
              if (graphNode.previewGhost) {
                return graphAccentCyan();
              }
              if (emphasis) {
                return "#e0f2fe";
              }
              return clusterColorForNodeId(nodeId);
            }}
            onNodeClick={(node) => {
              const nodeId = String(node.id);
              selectNode(nodeId);
              const x = node.x ?? 0;
              const y = node.y ?? 0;
              const z = node.z ?? 0;
              const distance = 140;
              const distRatio = 1 + distance / Math.hypot(x, y, z || 1);
              graphRef.current?.cameraPosition(
                {
                  x: x * distRatio,
                  y: y * distRatio,
                  z: (z + distance) * distRatio,
                },
                { x, y, z },
                400,
              );
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
