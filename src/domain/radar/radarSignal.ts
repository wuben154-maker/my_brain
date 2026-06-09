import type { BrainGraphSnapshot } from "@/domain/graph";
import type { WorldItem } from "@/domain/radar/worldItem";

export type RadarReasonCode =
  | "graph_concept_overlap"
  | "project_adjacent"
  | "interest_match"
  | "trend_anomaly"
  | "weak_tangent"
  | "fallback_warning";

export interface RadarSignal {
  worldItemId: string;
  reasonCode: RadarReasonCode;
  explanation: string;
  linkedNodeIds: string[];
  score: number;
}

export interface WorldItemScored {
  item: WorldItem;
  score: number;
  signals: RadarSignal[];
}

export interface ScoreWorldItemsResult {
  ranked: WorldItemScored[];
  signalsByItemId: Record<string, RadarSignal[]>;
}

export function assertRadarSignal(
  signal: RadarSignal,
  graph?: BrainGraphSnapshot,
): void {
  const errors = getRadarSignalValidationErrors(signal, graph);
  if (errors.length > 0) {
    throw new Error(`Invalid RadarSignal: ${errors.join("; ")}`);
  }
}

export function getRadarSignalValidationErrors(
  signal: RadarSignal,
  graph?: BrainGraphSnapshot,
): string[] {
  const errors: string[] = [];
  if (!signal.worldItemId.trim()) {
    errors.push("worldItemId must be non-empty");
  }
  if (!isRadarReasonCode(signal.reasonCode)) {
    errors.push("reasonCode must be a valid RadarReasonCode");
  }
  if (!signal.explanation.trim()) {
    errors.push("explanation must be non-empty");
  }
  if (Array.from(signal.explanation).length > 120) {
    errors.push("explanation must be <= 120 chars");
  }
  if (signal.score < 0 || signal.score > 1 || !Number.isFinite(signal.score)) {
    errors.push("score must be 0..1");
  }
  if (graph) {
    const graphNodeIds = new Set(graph.nodes.map((node) => node.id));
    for (const nodeId of signal.linkedNodeIds) {
      if (!graphNodeIds.has(nodeId)) {
        errors.push(`linkedNodeId not found in graph: ${nodeId}`);
      }
    }
  }
  return errors;
}

export function isRadarReasonCode(value: unknown): value is RadarReasonCode {
  return (
    value === "graph_concept_overlap" ||
    value === "project_adjacent" ||
    value === "interest_match" ||
    value === "trend_anomaly" ||
    value === "weak_tangent" ||
    value === "fallback_warning"
  );
}
