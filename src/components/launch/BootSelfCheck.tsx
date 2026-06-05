import { GlassCard } from "@/components/ui/GlassCard";
import { BootBrainSphere } from "@/components/launch/BootBrainSphere";
import {
  BootAmbientTelemetry,
  BootBottomRibbon,
  BootTopBar,
} from "@/components/launch/BootScreenChrome";
import { VisualBootDiagnostics } from "@/components/launch/VisualBootDiagnostics";
import { statusLabel } from "@/lib/bootSelfCheck";
import { readVisualSnapshotId } from "@/lib/visualSnapshotMode";
import {
  useAppStore,
  type BootCheckStatus,
  type SelfCheckItem,
} from "@/stores/appStore";

function CheckStatusIcon({ status }: { status: BootCheckStatus }) {
  if (status === "syncing") {
    return (
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center"
        aria-hidden
      >
        <span className="h-4 w-4 animate-sync-spin rounded-full border-2 border-status-syncing border-t-transparent" />
      </span>
    );
  }

  if (status === "ok") {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center text-status-ok"
        aria-hidden
      >
        ✓
      </span>
    );
  }

  if (status === "warn") {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center text-status-warn"
        aria-hidden
      >
        !
      </span>
    );
  }

  return (
    <span
      className="h-5 w-5 shrink-0 rounded-full border border-edge"
      aria-hidden
    />
  );
}

function BootCheckRow({ item, index }: { item: SelfCheckItem; index: number }) {
  const isActive = item.status === "syncing";
  const isDone = item.status === "ok" || item.status === "warn";

  return (
    <li
      className={[
        "flex items-start gap-3 rounded-sm px-2 py-2 transition-colors duration-200",
        isActive ? "bg-bg-elevated/50" : "",
        isDone ? "boot-check-done" : "",
        !isActive && !isDone ? "opacity-45" : "opacity-100",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ animationDelay: `${index * 200}ms` }}
    >
      <CheckStatusIcon status={item.status} />
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center justify-between gap-3">
          <span className="text-body text-primary">{item.label}</span>
          <span
            className={[
              "shrink-0 font-hud text-caption uppercase tracking-hud",
              item.status === "ok"
                ? "text-status-ok"
                : item.status === "warn"
                  ? "text-status-warn"
                  : item.status === "syncing"
                    ? "text-status-syncing"
                    : "text-muted",
            ].join(" ")}
          >
            {statusLabel(item.status)}
          </span>
        </div>
        {item.detail && item.status === "warn" ? (
          <p className="mt-1 text-caption text-status-warn">{item.detail}</p>
        ) : null}
      </div>
    </li>
  );
}

interface BootSelfCheckProps {
  onSkipVoice?: () => void;
}

/** Full-bleed sci-fi boot screen — grid layout fits 1440×900 without clipping. */
export function BootSelfCheck({ onSkipVoice }: BootSelfCheckProps) {
  const checks = useAppStore((state) => state.selfChecks);
  const logs = useAppStore((state) => state.bootLogs);
  const visualBoot = readVisualSnapshotId() === "boot";

  return (
    <section
      data-testid="boot-self-check"
      className="boot-screen relative h-full min-h-0 overflow-hidden"
    >
      <div className="boot-cosmic-bg pointer-events-none absolute inset-0" aria-hidden />
      <div className="boot-grid-floor pointer-events-none absolute inset-x-0 bottom-[18%]" aria-hidden />

      <BootTopBar />

      <main className="boot-main">
        <BootAmbientTelemetry />

        <div className="boot-hero-col">
          <BootBrainSphere />
        </div>

        <div className="boot-diag-col">
          {visualBoot ? (
            <VisualBootDiagnostics />
          ) : (
            <GlassCard active className="h-full p-4" data-testid="boot-diagnostics">
              <p className="mb-3 font-hud text-label uppercase tracking-hud text-muted">
                System Diagnostics
              </p>
              <p className="mb-3 text-caption text-secondary">
                Pre-flight check in progress
              </p>
              <ul className="space-y-1 overflow-y-auto">
                {checks.map((item, index) => (
                  <BootCheckRow key={item.id} item={item} index={index} />
                ))}
              </ul>
            </GlassCard>
          )}
        </div>
      </main>

      <BootBottomRibbon logs={logs} onSkipVoice={onSkipVoice} />
    </section>
  );
}
