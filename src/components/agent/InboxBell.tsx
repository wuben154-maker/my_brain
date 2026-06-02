interface InboxBellProps {
  pendingCount: number;
  onClick: () => void;
}

export function InboxBell({ pendingCount, onClick }: InboxBellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-sm border border-hud bg-bg-panel px-3 py-1.5 font-hud text-label uppercase tracking-hud text-secondary backdrop-blur-md transition-[color,border-color] duration-150 hover:border-hud-active hover:text-accent-cyan"
      aria-label={
        pendingCount > 0
          ? `待办建议，${pendingCount} 条待确认`
          : "待办建议收件箱"
      }
      data-testid="inbox-bell"
    >
      <span className="inline-flex items-center gap-1.5">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden
        >
          <path d="M12 3a5 5 0 0 0-5 5v2.5c0 .8-.3 1.6-.8 2.2L4.5 15.5h15l-1.7-2.8a3.5 3.5 0 0 1-.8-2.2V8a5 5 0 0 0-5-5Z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </svg>
        待办建议
      </span>
      {pendingCount > 0 ? (
        <span
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-cyan px-1 text-[0.625rem] font-medium text-bg-base"
          data-testid="inbox-bell-badge"
        >
          {pendingCount > 99 ? "99+" : pendingCount}
        </span>
      ) : null}
    </button>
  );
}
