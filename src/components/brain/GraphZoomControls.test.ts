import { describe, expect, it } from "vitest";
import {
  depthPercentToLayer,
  layerToDepthPercent,
} from "@/lib/graphLayerDepth";

describe("GraphZoomControls depth mapping", () => {
  it("maps slider ends to 1层 and 6层", () => {
    expect(depthPercentToLayer(0)).toBe(1);
    expect(depthPercentToLayer(100)).toBe(6);
  });

  it("round-trips discrete layers through percent", () => {
    for (let layer = 1; layer <= 6; layer += 1) {
      expect(depthPercentToLayer(layerToDepthPercent(layer))).toBe(layer);
    }
  });
});
