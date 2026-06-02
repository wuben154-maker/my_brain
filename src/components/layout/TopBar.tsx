/**
 * Global top bar — brand, knowledge search, mode toggle, utilities.
 * Tokens only (DESIGN.md §1–4). Decorative controls for now; search/profile
 * wiring lands with later milestones.
 */
export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-hud bg-bg-elevated/60 px-4 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md border border-hud-active bg-bg-panel text-accent-cyan shadow-glow-cyan">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden
          >
            <path d="M12 2 3 7v10l9 5 9-5V7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </span>
        <p className="font-hud text-h2 font-medium uppercase tracking-hud text-primary">
          NEUROHUB
        </p>
        <span className="font-hud text-caption text-muted">v2.7.1</span>
      </div>

      <div className="relative mx-2 hidden max-w-xl flex-1 items-center md:flex">
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-3 h-4 w-4 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
        <input
          type="search"
          placeholder="搜索知识、概念、文档…"
          aria-label="搜索知识、概念、文档"
          className="w-full rounded-sm border border-hud bg-bg-overlay/60 py-2 pl-9 pr-3 text-body text-primary placeholder:text-muted focus:border-hud-active focus:outline-none"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden items-center gap-2 rounded-full border border-hud bg-bg-panel px-3 py-1.5 sm:flex">
          <span className="font-hud text-label uppercase tracking-hud text-secondary">
            智能模式
          </span>
          <span className="relative inline-block h-4 w-7 rounded-full bg-accent-cyan/25">
            <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-accent-cyan shadow-glow-cyan" />
          </span>
        </span>

        {[0, 1].map((key) => (
          <button key={key} type="button" className="graph-hud-btn" aria-hidden>
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              {key === 0 ? (
                <>
                  <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
                  <circle cx="12" cy="12" r="5" />
                </>
              ) : (
                <path d="M6 8h12M6 12h12M6 16h8" />
              )}
            </svg>
          </button>
        ))}

        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-hud-active bg-bg-panel font-hud text-label text-accent-cyan">
          N
        </span>
      </div>
    </header>
  );
}
