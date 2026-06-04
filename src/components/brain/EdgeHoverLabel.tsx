import type { RelationType } from "@/domain/graph";
import { relationTypeLabel } from "@/lib/relationLabels";

interface EdgeHoverLabelProps {
  relationType: RelationType;
  left: number;
  top: number;
}

/** Relation type label while hovering an edge (V6). */
export function EdgeHoverLabel({
  relationType,
  left,
  top,
}: EdgeHoverLabelProps) {
  return (
    <div
      data-testid="edge-hover-label"
      className="pointer-events-none absolute z-20 rounded border border-hud bg-bg-elevated/95 px-2 py-1 font-hud text-label uppercase tracking-hud text-accent-cyan shadow-md backdrop-blur-sm"
      style={{ left: Math.max(8, left), top: Math.max(8, top) }}
    >
      {relationTypeLabel(relationType)}
    </div>
  );
}
