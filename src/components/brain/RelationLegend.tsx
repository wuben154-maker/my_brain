import {
  RELATION_VISUAL_ORDER,
  RELATION_VISUAL_TOKENS,
  type RelationLineStyle,
} from "@/lib/graphVisualTokens";

function RelationLineSample({
  color,
  lineStyle,
}: {
  color: string;
  lineStyle: RelationLineStyle;
}) {
  const thin = lineStyle === "thin-solid";
  const dashed = lineStyle === "dashed";

  return (
    <svg
      width={28}
      height={8}
      viewBox="0 0 28 8"
      aria-hidden
      className="shrink-0"
    >
      <line
        x1={0}
        y1={4}
        x2={28}
        y2={4}
        stroke={color}
        strokeWidth={thin ? 1 : 2}
        strokeDasharray={dashed ? "4 3" : undefined}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Bottom-left HUD legend for the six visual relation types (P0-5). */
export function RelationLegend() {
  return (
    <div
      data-testid="relation-legend"
      className="companion-hud-panel companion-legend-glass glass-card w-[8.75rem] shrink-0 p-2.5 backdrop-blur-md"
      aria-label="关系图例"
    >
      <ul className="space-y-1.5">
        {RELATION_VISUAL_ORDER.map((kind) => {
          const token = RELATION_VISUAL_TOKENS[kind];
          return (
            <li key={kind} className="flex items-center gap-2">
              <RelationLineSample
                color={token.color}
                lineStyle={token.lineStyle}
              />
              <span className="text-caption text-secondary">
                {token.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
