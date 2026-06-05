/**
 * Global top bar — static NEUROHUB brand identity band.
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
    </header>
  );
}
