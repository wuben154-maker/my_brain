import type { RelationType } from "@/domain/graph";

/** Resolved graph colors from :root CSS tokens (canvas cannot use var() in all paths). */

/** Six visual relation kinds — data layer may map to these later (six_visual). */
export type VisualRelationKind =
  | "causal"
  | "correlation"
  | "influence"
  | "containment"
  | "temporal"
  | "emotional";

export type RelationLineStyle = "solid" | "dashed" | "thin-solid";

export interface RelationVisualToken {
  label: string;
  color: string;
  lineStyle: RelationLineStyle;
}

export const RELATION_VISUAL_ORDER: readonly VisualRelationKind[] = [
  "causal",
  "correlation",
  "influence",
  "containment",
  "temporal",
  "emotional",
] as const;

export const RELATION_VISUAL_TOKENS: Record<
  VisualRelationKind,
  RelationVisualToken
> = {
  causal: { label: "因果关系", color: "#4A6BFF", lineStyle: "solid" },
  correlation: { label: "相关关系", color: "#3BE8E0", lineStyle: "dashed" },
  influence: { label: "影响关系", color: "#4ADE9B", lineStyle: "thin-solid" },
  containment: { label: "包含关系", color: "#2BB6C9", lineStyle: "solid" },
  temporal: { label: "时间关系", color: "#8B7BFF", lineStyle: "solid" },
  emotional: { label: "情感连接", color: "#C77DFF", lineStyle: "dashed" },
};

/** Domain RelationType → closest visual relation (four types mapped; two reserved for legend). */
export const DOMAIN_TO_VISUAL_RELATION: Record<
  RelationType,
  VisualRelationKind
> = {
  is_a: "containment",
  depends_on: "influence",
  replaces: "causal",
  related: "correlation",
};

export function visualRelationForDomain(
  relationType: string,
): VisualRelationKind {
  const mapped =
    DOMAIN_TO_VISUAL_RELATION[relationType as RelationType] ?? "correlation";
  return mapped;
}

export function relationVisualForDomain(
  relationType: string,
): RelationVisualToken {
  return RELATION_VISUAL_TOKENS[visualRelationForDomain(relationType)];
}

export function relationLinkWidth(
  token: RelationVisualToken,
  highlighted: boolean,
): number {
  if (highlighted) {
    return 2;
  }
  if (token.lineStyle === "thin-solid") {
    return 0.75;
  }
  return 1.05;
}

export function relationLinkStrokeColor(
  token: RelationVisualToken,
  highlighted: boolean,
  accentColor: string,
  alpha = 0.55,
): string {
  if (highlighted) {
    return accentColor;
  }
  return withAlpha(token.color, alpha);
}

export interface RelationLinkPaintInput {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  curvature: number;
  globalScale: number;
  token: RelationVisualToken;
  highlighted: boolean;
  accentColor: string;
  alpha?: number;
}

/** Canvas stroke for one graph edge using relation visual tokens. */
export function paintRelationLink(
  ctx: CanvasRenderingContext2D,
  input: RelationLinkPaintInput,
): void {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    curvature,
    globalScale,
    token,
    highlighted,
    accentColor,
    alpha = 0.55,
  } = input;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const linkLen = Math.hypot(dx, dy);
  if (linkLen < 1e-6) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(sourceX, sourceY);
  if (Math.abs(curvature) < 1e-6) {
    ctx.lineTo(targetX, targetY);
  } else {
    const perpX = -dy / linkLen;
    const perpY = dx / linkLen;
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;
    const cpX = midX + perpX * linkLen * curvature;
    const cpY = midY + perpY * linkLen * curvature;
    ctx.quadraticCurveTo(cpX, cpY, targetX, targetY);
  }

  ctx.strokeStyle = relationLinkStrokeColor(
    token,
    highlighted,
    accentColor,
    alpha,
  );
  ctx.lineWidth = relationLinkWidth(token, highlighted) / globalScale;
  if (token.lineStyle === "dashed") {
    ctx.setLineDash([5 / globalScale, 4 / globalScale]);
  } else {
    ctx.setLineDash([]);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

const CLUSTER_VAR_NAMES = [
  "--node-cyan",
  "--node-blue",
  "--node-violet",
  "--node-amber",
] as const;

let cachedClusterColors: string[] | null = null;
let cachedEdgeColor: string | null = null;

function readCssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value.length > 0 ? value : fallback;
}

export function graphClusterColors(): readonly string[] {
  if (cachedClusterColors) {
    return cachedClusterColors;
  }
  cachedClusterColors = CLUSTER_VAR_NAMES.map((name, index) =>
    readCssVar(
      name,
      ["#22d3ee", "#3b82f6", "#a78bfa", "#f59e0b"][index] ?? "#22d3ee",
    ),
  );
  return cachedClusterColors;
}

export function graphEdgeColor(): string {
  if (cachedEdgeColor) {
    return cachedEdgeColor;
  }
  cachedEdgeColor = readCssVar("--edge", "rgba(120, 160, 220, 0.25)");
  return cachedEdgeColor;
}

export function graphAccentCyan(): string {
  return readCssVar("--accent-cyan", "#22d3ee");
}

/** Stable cluster bucket from node id (not render order). */
export function clusterIndexForNodeId(nodeId: string): number {
  let hash = 0;
  for (let i = 0; i < nodeId.length; i += 1) {
    hash = (hash + nodeId.charCodeAt(i) * (i + 1)) % 9973;
  }
  return hash % CLUSTER_VAR_NAMES.length;
}

export function clusterColorForNodeId(nodeId: string): string {
  const colors = graphClusterColors();
  return colors[clusterIndexForNodeId(nodeId)] ?? colors[0];
}

/** Convert a `#rgb` / `#rrggbb` token to `rgba(...)`; pass other formats through. */
export function withAlpha(color: string, alpha: number): string {
  const value = color.trim();
  if (!value.startsWith("#")) {
    return value;
  }
  let hex = value.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (hex.length !== 6) {
    return value;
  }
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function invalidateGraphVisualTokenCache(): void {
  cachedClusterColors = null;
  cachedEdgeColor = null;
}
