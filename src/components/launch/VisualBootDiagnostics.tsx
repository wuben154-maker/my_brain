import type { SelfCheckItem, BootCheckStatus } from "@/stores/appStore";
import { useAppStore } from "@/stores/appStore";

function DesignCheckIcon({ status, index }: { status: BootCheckStatus; index: number }) {
  const hues = ["#22d3ee", "#3b82f6", "#a78bfa", "#34d399", "#f59e0b", "#6366f1", "#22d3ee"];
  const color = hues[index % hues.length];

  if (status === "syncing") {
    return (
      <span className="visual-boot-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-accent-cyan/40 bg-bg-elevated">
        <span className="h-4 w-4 animate-sync-spin rounded-full border-2 border-status-syncing border-t-transparent" />
      </span>
    );
  }

  return (
    <span
      className="visual-boot-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-hud bg-bg-elevated"
      style={{ boxShadow: `inset 0 0 12px ${color}33` }}
    >
      <span
        className="h-3 w-3 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
    </span>
  );
}

function DesignStatusPill({ status }: { status: BootCheckStatus }) {
  if (status === "ok") {
    return (
      <span className="visual-boot-pill visual-boot-pill-ok">
        <span className="visual-boot-pill-check" aria-hidden>
          ✓
        </span>
        OK
      </span>
    );
  }

  if (status === "syncing") {
    return (
      <span className="visual-boot-pill visual-boot-pill-syncing">
        <span
          className="h-3 w-3 animate-sync-spin rounded-full border-[1.5px] border-status-syncing border-t-transparent"
          aria-hidden
        />
        SYNCING
      </span>
    );
  }

  if (status === "warn") {
    return (
      <span className="visual-boot-pill visual-boot-pill-warn">
        <span className="visual-boot-pill-check" aria-hidden>
          !
        </span>
        WARN
      </span>
    );
  }

  return (
    <span className="visual-boot-pill visual-boot-pill-pending">
      <span className="visual-boot-pill-clock" aria-hidden>
        ◷
      </span>
      PENDING
    </span>
  );
}

function DesignCheckRow({ item, index }: { item: SelfCheckItem; index: number }) {
  const dim = item.status === "pending";
  return (
    <li
      className={[
        "visual-boot-row flex items-center gap-3 border-b border-hud/40 py-2.5 last:border-b-0",
        dim ? "opacity-55" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <DesignCheckIcon status={item.status} index={index} />
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] font-medium leading-tight text-primary">
          {item.label}
        </p>
        {item.detail ? (
          <p className="mt-0.5 text-[0.6875rem] leading-snug text-secondary">
            {item.detail}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-end">
        <DesignStatusPill status={item.status} />
      </div>
    </li>
  );
}

/** Pixel-regression surface aligned to boot-self-check.png diagnostics crop. */
export function VisualBootDiagnostics() {
  const checks = useAppStore((state) => state.selfChecks);
  const progress = useAppStore((state) => state.bootProgress);

  return (
    <div
      data-testid="boot-diagnostics"
      className="visual-boot-panel glass-card w-full max-w-none p-5"
    >
      <header className="relative z-10 mb-3">
        <p className="font-hud text-[0.6875rem] uppercase tracking-hud text-muted">
          System Diagnostics
        </p>
        <p className="mt-1 text-[0.6875rem] text-secondary">
          Pre-flight check in progress
        </p>
      </header>

      <div className="relative z-10 mb-3 flex items-center gap-3">
        <div
          className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-bg-elevated"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="boot-progress-fill h-full rounded-full bg-accent-cyan shadow-glow-cyan"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="shrink-0 font-hud text-[0.75rem] tabular-nums text-accent-cyan">
          {progress}%
        </span>
      </div>

      <ul className="relative z-10">
        {checks.map((item, index) => (
          <DesignCheckRow key={item.id} item={item} index={index} />
        ))}
      </ul>
    </div>
  );
}
