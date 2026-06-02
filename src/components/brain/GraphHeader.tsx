import { InboxBell } from "@/components/agent/InboxBell";
import { effectiveGraphViewMode } from "@/lib/graphViewMode";
import { useAgentInboxStore } from "@/stores/agentInboxStore";
import { useProposalStore } from "@/stores/proposalStore";
import { useUiStore } from "@/stores/uiStore";

/**
 * Graph canvas header — active graph title + view tools (DESIGN.md §5 layout).
 */
export function GraphHeader() {
  const pendingCount = useProposalStore((state) => state.pending.length);
  const setInboxOpen = useAgentInboxStore((state) => state.setInboxOpen);
  const storedGraphViewMode = useUiStore((state) => state.graphViewMode);
  const setGraphViewMode = useUiStore((state) => state.setGraphViewMode);
  const graphViewMode = effectiveGraphViewMode(storedGraphViewMode);
  const is3dActive = graphViewMode === "3d";

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 px-1">
      <button
        type="button"
        className="flex items-center gap-2 rounded-sm px-1 py-1 text-h2 font-medium text-primary hover:text-accent-cyan"
      >
        人工智能知识图谱
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-secondary"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div className="flex items-center gap-2">
        <InboxBell
          pendingCount={pendingCount}
          onClick={() => setInboxOpen(true)}
        />
        {["力导向布局", "主题"].map((label) => (
          <button
            key={label}
            type="button"
            className="rounded-sm border border-hud bg-bg-panel px-3 py-1.5 font-hud text-label uppercase tracking-hud text-secondary backdrop-blur-md transition-[color,border-color] duration-150 hover:border-hud-active hover:text-accent-cyan"
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={is3dActive}
          data-testid="graph-view-3d-toggle"
          className={[
            "rounded-sm border px-3 py-1.5 font-hud text-label uppercase tracking-hud backdrop-blur-md transition-[color,border-color] duration-150",
            is3dActive
              ? "border-accent-cyan bg-accent-cyan/10 text-accent-cyan"
              : "border-hud bg-bg-panel text-secondary hover:border-hud-active hover:text-accent-cyan",
          ].join(" ")}
          onClick={() => setGraphViewMode(is3dActive ? "2d" : "3d")}
        >
          3D 视图
        </button>
        <button type="button" className="graph-hud-btn" aria-label="全屏">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden
          >
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
