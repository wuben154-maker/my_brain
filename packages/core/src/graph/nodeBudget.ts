import type { GraphNode } from "./types.js";

/** Minimum visible nodes for Brain Map exploration (plan §8). */
export const BRAIN_MAP_VISIBLE_MIN = 30;

/** Maximum visible nodes on mobile — avoids full-table mount. */
export const BRAIN_MAP_VISIBLE_MAX = 80;

export const DEFAULT_NODE_BUDGET = BRAIN_MAP_VISIBLE_MAX;

export function clampNodeBudget(requested?: number): number {
  if (requested === undefined) {
    return DEFAULT_NODE_BUDGET;
  }
  return Math.min(BRAIN_MAP_VISIBLE_MAX, Math.max(1, requested));
}

/**
 * Select nodes for map/home rendering with optional archived inclusion.
 * Never returns more than `budget` items.
 */
export function selectBudgetedNodes(
  nodes: readonly GraphNode[],
  options?: {
    budget?: number;
    includeArchived?: boolean;
  },
): GraphNode[] {
  const budget = clampNodeBudget(options?.budget);
  const includeArchived = options?.includeArchived ?? false;

  const pool = includeArchived ? [...nodes] : nodes.filter((node) => !node.archived);
  if (pool.length <= budget) {
    return pool.map((node) => ({ ...node, sourceLinks: [...node.sourceLinks] }));
  }

  return [...pool]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, budget)
    .map((node) => ({ ...node, sourceLinks: [...node.sourceLinks] }));
}

export function isWithinNodeBudget(visibleCount: number, budget = DEFAULT_NODE_BUDGET): boolean {
  return visibleCount <= budget;
}
