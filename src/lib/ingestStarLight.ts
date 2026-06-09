import { useGraphStore } from "@/stores/graphStore";

/** KOS-A2 star-light pulse duration (mock clocks may advance faster in tests). */
export const INGEST_STAR_LIGHT_DURATION_MS = 1000;

let starLightTimer: ReturnType<typeof setTimeout> | null = null;

/** Focus + highlight a newly ingested node for the star-light window. */
export function pulseIngestStarLight(
  nodeId: string,
  durationMs: number = INGEST_STAR_LIGHT_DURATION_MS,
): void {
  if (starLightTimer) {
    clearTimeout(starLightTimer);
    starLightTimer = null;
  }
  useGraphStore.getState().setIngestStarLight(nodeId);
  starLightTimer = setTimeout(() => {
    useGraphStore.getState().clearIngestStarLight();
    starLightTimer = null;
  }, durationMs);
}

/** Test hook — cancel pending star-light timers. */
export function resetIngestStarLightForTests(): void {
  if (starLightTimer) {
    clearTimeout(starLightTimer);
    starLightTimer = null;
  }
  useGraphStore.getState().clearIngestStarLight();
}
