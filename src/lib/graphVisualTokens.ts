/** Resolved graph colors from :root CSS tokens (canvas cannot use var() in all paths). */

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

export function invalidateGraphVisualTokenCache(): void {
  cachedClusterColors = null;
  cachedEdgeColor = null;
}
