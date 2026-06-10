import type { BrainGraphSnapshot, ConceptNode } from "../domain/graph";
import { isConceptNode } from "../domain/graph";

export type SalienceEventKind =
  | "recall_hit"
  | "mention"
  | "confirm"
  | "manual_edit";

export interface SalienceEvent {
  kind: SalienceEventKind;
  at: number;
  nodeId: string;
}

export const DEFAULT_SALIENCE = 1;
export const SALIENCE_HALF_LIFE_MS = 30 * 24 * 60 * 60 * 1000;
export const SALIENCE_MAX = 2;

const EVENT_BOOST: Record<SalienceEventKind, number> = {
  recall_hit: 0.12,
  mention: 0.18,
  confirm: 0.28,
  manual_edit: 0.22,
};

export function decay(score: number, ageMs: number, halfLifeMs: number): number {
  if (ageMs <= 0 || halfLifeMs <= 0) {
    return score;
  }
  return score * 0.5 ** (ageMs / halfLifeMs);
}

function clampSalience(value: number): number {
  return Math.min(SALIENCE_MAX, Math.max(0, value));
}

function lastTouchMs(node: ConceptNode): number {
  const raw = node.lastTouchedAt ?? node.updatedAt;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Deterministic salience from stored score, age decay, and recent events. */
export function computeSalience(
  node: ConceptNode,
  nowMs: number,
  events: SalienceEvent[],
): number {
  const stored = node.salience ?? DEFAULT_SALIENCE;
  const ageMs = Math.max(0, nowMs - lastTouchMs(node));
  let score = decay(stored, ageMs, SALIENCE_HALF_LIFE_MS);

  for (const event of events) {
    if (event.nodeId !== node.id) {
      continue;
    }
    score += EVENT_BOOST[event.kind];
  }

  return clampSalience(score);
}

/** Persisted bump when the user or agent touches a concept (signals only — no archive). */
export function applySalienceEvent(
  node: ConceptNode,
  kind: SalienceEventKind,
  atMs: number = Date.now(),
): ConceptNode {
  const nextScore = clampSalience((node.salience ?? DEFAULT_SALIENCE) + EVENT_BOOST[kind]);
  return {
    ...node,
    salience: nextScore,
    lastTouchedAt: new Date(atMs).toISOString(),
  };
}

export function normalizeConceptSalience(node: ConceptNode): ConceptNode {
  return {
    ...node,
    sourceRefs: node.sourceRefs ?? [],
    salience: node.salience ?? DEFAULT_SALIENCE,
    lastTouchedAt: node.lastTouchedAt ?? node.updatedAt,
  };
}

export interface LowSalienceCandidate {
  nodeId: string;
  salience: number;
  reason: string;
}

/** C2-facing ranking: lowest salience + stale touch first (archive suggestions consume this). */
export function rankLowSalienceCandidates(
  snapshot: BrainGraphSnapshot,
  nowMs: number,
  events: SalienceEvent[],
  options: { limit?: number; maxSalience?: number } = {},
): LowSalienceCandidate[] {
  const limit = options.limit ?? 10;
  const maxSalience = options.maxSalience ?? 0.4;

  return snapshot.nodes
    .filter((node): node is ConceptNode => isConceptNode(node) && !node.archived)
    .map((node) => ({
      node,
      salience: computeSalience(node, nowMs, events),
      lastTouchMs: lastTouchMs(node),
    }))
    .filter((row) => row.salience <= maxSalience)
    .sort(
      (a, b) =>
        a.salience - b.salience ||
        a.lastTouchMs - b.lastTouchMs,
    )
    .slice(0, limit)
    .map((row) => ({
      nodeId: row.node.id,
      salience: row.salience,
      reason: `显著度 ${row.salience.toFixed(2)}，久未强化（${row.node.title}）`,
    }));
}

/** Map salience to node glow/opacity for the star map (SHOULD in M2). */
export function salienceVisualAlpha(
  node: ConceptNode,
  nowMs: number = Date.now(),
  events: SalienceEvent[] = [],
): number {
  const score = computeSalience(node, nowMs, events);
  return 0.35 + Math.min(1, score / SALIENCE_MAX) * 0.65;
}
