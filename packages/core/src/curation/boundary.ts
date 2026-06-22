import type { IngestDeps } from "../conversation/ingest.js";
import type { AutoCurateBoundary, AutoCurateResult } from "../conversation/autoCurateBoundary.js";
import { runAutoCurateForIngest } from "./run.js";

export function createDefaultAutoCurateBoundary(): AutoCurateBoundary {
  return {
    afterIngest(nodeId: string, deps: IngestDeps): AutoCurateResult {
      const result = runAutoCurateForIngest(nodeId, deps);
      return {
        summary: result.summary,
        edgesAdded: result.edgesAdded,
      };
    },
  };
}

export const defaultAutoCurateBoundary = createDefaultAutoCurateBoundary();
