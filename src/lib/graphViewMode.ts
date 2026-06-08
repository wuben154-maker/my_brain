import { readVisualSnapshotId } from "@/lib/visualSnapshotMode";
import type { GraphViewMode } from "@/stores/uiStore";
import { useUiStore } from "@/stores/uiStore";

/** Visual regression pins 2D only — G1 must not move the pixel baseline. */
export function effectiveGraphViewMode(
  stored: GraphViewMode,
  visualId = readVisualSnapshotId(),
): GraphViewMode {
  if (
    visualId === "companion-main" ||
    visualId === "companion" ||
    visualId === "main"
  ) {
    return "2d";
  }
  return stored;
}

export function useEffectiveGraphViewMode(): GraphViewMode {
  const stored = useUiStore((state) => state.graphViewMode);
  return effectiveGraphViewMode(stored);
}
