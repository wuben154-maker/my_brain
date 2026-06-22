import { defaultAutoCurateBoundary } from "../curation/boundary.js";
import type { IngestDeps } from "./ingest.js";

export interface AutoCurateResult {
  summary: string;
  edgesAdded: number;
}

export interface AutoCurateBoundary {
  afterIngest(nodeId: string, deps: IngestDeps): AutoCurateResult;
}

let registeredBoundary: AutoCurateBoundary | null = null;

/** Override default merge/link/archive boundary for tests or custom wiring. */
export function setAutoCurateBoundary(boundary: AutoCurateBoundary | null): void {
  registeredBoundary = boundary;
}

export function getAutoCurateBoundary(): AutoCurateBoundary | null {
  return registeredBoundary;
}

/** Post-ingest curation — merge/link/archive with history; runs only after confirmed ingest. */
export function runAutoCurateBoundary(
  nodeId: string,
  deps: IngestDeps,
): AutoCurateResult {
  const boundary = registeredBoundary ?? defaultAutoCurateBoundary;
  return boundary.afterIngest(nodeId, deps);
}
