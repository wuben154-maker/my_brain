import { useCallback, useEffect, useRef, useState } from "react";
import type { GraphEdge } from "@/domain/graph";
import { useGraphStore } from "@/stores/graphStore";

const DEFAULT_PACE_MS = 1000;

function edgeIdsAlongPath(
  nodeIds: string[],
  edges: GraphEdge[],
): string[] {
  if (nodeIds.length < 2) {
    return [];
  }
  const edgeIds: string[] = [];
  for (let i = 0; i < nodeIds.length - 1; i += 1) {
    const from = nodeIds[i];
    const to = nodeIds[i + 1];
    const match = edges.find(
      (edge) =>
        (edge.sourceId === from && edge.targetId === to) ||
        (edge.sourceId === to && edge.targetId === from),
    );
    if (match) {
      edgeIds.push(match.id);
    }
  }
  return edgeIds;
}

export interface WalkthroughHighlightOptions {
  onStep?: (nodeId: string) => void;
}

export interface WalkthroughHighlight {
  activeNodeId: string | null;
  activeEdgeIds: string[];
  stepIndex: number;
  start: (overrideNodeIds?: string[]) => void;
  stop: () => void;
}

export function useWalkthroughHighlight(
  nodeIds: string[],
  paceMs: number = DEFAULT_PACE_MS,
  options?: WalkthroughHighlightOptions,
): WalkthroughHighlight {
  const edges = useGraphStore((state) => state.edges);
  const setHighlights = useGraphStore((state) => state.setHighlights);
  const clearHighlights = useGraphStore((state) => state.clearHighlights);

  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [activeEdgeIds, setActiveEdgeIds] = useState<string[]>([]);
  const [stepIndex, setStepIndex] = useState(-1);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onStepRef = useRef(options?.onStep);

  useEffect(() => {
    onStepRef.current = options?.onStep;
  }, [options?.onStep]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setActiveNodeId(null);
    setActiveEdgeIds([]);
    setStepIndex(-1);
    clearHighlights();
  }, [clearHighlights]);

  const start = useCallback(
    (overrideNodeIds?: string[]) => {
      stop();
      const path = overrideNodeIds ?? nodeIds;
      if (path.length === 0) {
        return;
      }

      let index = 0;
      const tick = () => {
        const nodeId = path[index];
        if (!nodeId) {
          return;
        }
        const hop =
          index > 0
            ? edgeIdsAlongPath([path[index - 1], nodeId], edges)
            : [];
        setActiveNodeId(nodeId);
        setActiveEdgeIds(hop);
        setStepIndex(index);
        setHighlights([nodeId], hop);
        onStepRef.current?.(nodeId);

        index += 1;
        if (index >= path.length) {
          timerRef.current = setTimeout(() => stop(), paceMs);
          return;
        }
        timerRef.current = setTimeout(tick, paceMs);
      };

      tick();
    },
    [edges, nodeIds, paceMs, setHighlights, stop],
  );

  useEffect(() => () => stop(), [stop]);

  return {
    activeNodeId,
    activeEdgeIds,
    stepIndex,
    start,
    stop,
  };
}
