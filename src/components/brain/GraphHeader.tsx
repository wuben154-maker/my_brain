/**
 * Graph canvas header — active graph title + view tools (DESIGN.md §5 layout).
 * Tools are visual scaffold; layout/3D switching wires up later.
 */
export function GraphHeader() {
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
        {["力导向布局", "主题", "3D 视图"].map((label) => (
          <button
            key={label}
            type="button"
            className="rounded-sm border border-hud bg-bg-panel px-3 py-1.5 font-hud text-label uppercase tracking-hud text-secondary backdrop-blur-md transition-[color,border-color] duration-150 hover:border-hud-active hover:text-accent-cyan"
          >
            {label}
          </button>
        ))}
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
