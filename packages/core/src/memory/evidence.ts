import type { GraphChangeRecord, GraphEdge, GraphNode } from "../graph/types.js";
import type { LearningTraceRecord, WorldItemRecord } from "../storage/mobileStorage.js";
import type { ProvisionalCandidate } from "../provisional/types.js";
import type { M5EvidenceBundle } from "./types.js";

export function graphChangeRef(id: string): string {
  return `graph_change:${id}`;
}

export function learningTraceRef(id: string): string {
  return `learning_trace:${id}`;
}

export function radarSignalRef(id: string): string {
  return `radar:${id}`;
}

export function captureRef(id: string): string {
  return `capture:${id}`;
}

export function nodeRef(id: string): string {
  return `node:${id}`;
}

export function buildEvidenceBundle(input: {
  graphChanges?: GraphChangeRecord[];
  learningTraces?: LearningTraceRecord[];
  radarSignals?: WorldItemRecord[];
  captures?: ProvisionalCandidate[];
  nodes?: GraphNode[];
  edges?: GraphEdge[];
}): M5EvidenceBundle {
  return {
    graphChanges: input.graphChanges ?? [],
    learningTraces: input.learningTraces ?? [],
    radarSignals: input.radarSignals ?? [],
    captures: input.captures ?? [],
    nodes: input.nodes ?? [],
    edges: input.edges ?? [],
  };
}

export function collectEvidenceRefs(bundle: M5EvidenceBundle): string[] {
  const refs: string[] = [];
  for (const change of bundle.graphChanges) {
    refs.push(graphChangeRef(change.id));
  }
  for (const trace of bundle.learningTraces) {
    refs.push(learningTraceRef(trace.id));
  }
  for (const signal of bundle.radarSignals) {
    refs.push(radarSignalRef(signal.id));
  }
  for (const capture of bundle.captures) {
    refs.push(captureRef(capture.id));
  }
  return refs;
}

export function hasAnyEvidence(bundle: M5EvidenceBundle): boolean {
  return collectEvidenceRefs(bundle).length > 0;
}
