import { useEffect, useMemo, useRef } from "react";

export interface MinimapNode {
  id: string;
  x: number;
  y: number;
  archived: boolean;
  color: string;
}

interface GraphMinimapProps {
  nodes: MinimapNode[];
  width?: number;
  height?: number;
  /** When true, omit absolute positioning (parent stack handles layout). */
  embedded?: boolean;
}

export function GraphMinimap({
  nodes,
  width = 128,
  height = 88,
  embedded = false,
}: GraphMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const bounds = useMemo(() => {
    if (nodes.length === 0) {
      return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
    }
    let minX = nodes[0]!.x;
    let maxX = nodes[0]!.x;
    let minY = nodes[0]!.y;
    let maxY = nodes[0]!.y;
    for (const node of nodes) {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    }
    const pad = 24;
    return {
      minX: minX - pad,
      maxX: maxX + pad,
      minY: minY - pad,
      maxY: maxY + pad,
    };
  }, [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "rgba(15, 22, 38, 0.72)";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(120, 160, 220, 0.25)";
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    const spanX = bounds.maxX - bounds.minX || 1;
    const spanY = bounds.maxY - bounds.minY || 1;

    for (const node of nodes) {
      const nx = ((node.x - bounds.minX) / spanX) * (width - 8) + 4;
      const ny = ((node.y - bounds.minY) / spanY) * (height - 8) + 4;
      const radius = node.archived ? 1.5 : 2.5;
      ctx.beginPath();
      ctx.arc(nx, ny, radius, 0, Math.PI * 2);
      ctx.fillStyle = node.archived
        ? "rgba(92, 107, 133, 0.55)"
        : node.color;
      ctx.globalAlpha = node.archived ? 0.35 : 1;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }, [bounds, height, nodes, width]);

  return (
    <div
      data-testid="graph-minimap"
      className={
        embedded
          ? "graph-minimap shrink-0"
          : "graph-minimap absolute bottom-4 left-4 z-[2]"
      }
      aria-label="图谱小地图"
    >
      <canvas ref={canvasRef} className="rounded-sm" />
    </div>
  );
}
