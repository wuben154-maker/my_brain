const DEPTH_LAYER_MIN = 1;
const DEPTH_LAYER_MAX = 6;

/** Map 0–100 slider position to design's 1–6 layer labels (bottom=1, top=6). */
export function depthPercentToLayer(percent: number): number {
  const clamped = Math.max(0, Math.min(100, percent));
  return Math.round(
    DEPTH_LAYER_MIN +
      (clamped / 100) * (DEPTH_LAYER_MAX - DEPTH_LAYER_MIN),
  );
}

export function layerToDepthPercent(layer: number): number {
  const clamped = Math.max(DEPTH_LAYER_MIN, Math.min(DEPTH_LAYER_MAX, layer));
  return ((clamped - DEPTH_LAYER_MIN) / (DEPTH_LAYER_MAX - DEPTH_LAYER_MIN)) * 100;
}
