import { useEffect, useRef } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { VisualBootDiagnostics } from "@/components/launch/VisualBootDiagnostics";
import { statusLabel } from "@/lib/bootSelfCheck";
import { readVisualSnapshotId } from "@/lib/visualSnapshotMode";
import {
  useAppStore,
  type BootCheckStatus,
  type SelfCheckItem,
} from "@/stores/appStore";

function NeuralCoreOrb() {
  return (
    <div
      className="relative flex h-44 w-44 shrink-0 items-center justify-center lg:h-56 lg:w-56"
      aria-hidden
    >
      <div className="boot-orb-halo absolute inset-0 rounded-full" />
      <div className="boot-orb-ring absolute inset-3 rounded-full" />
      <div className="boot-orb-core relative z-10 flex h-28 w-28 items-center justify-center rounded-full lg:h-32 lg:w-32">
        <div className="h-14 w-14 rounded-full bg-accent-cyan/20 shadow-glow-cyan lg:h-16 lg:w-16" />
      </div>
    </div>
  );
}

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

function BootProgressBar() {
  const progress = useAppStore((state) => state.bootProgress);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between font-hud text-caption uppercase tracking-hud text-muted">
        <span>boot progress</span>
        <span className="text-accent-cyan">{progress}%</span>
      </div>
      <div
        className="h-1 overflow-hidden rounded-full bg-bg-elevated"
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
    </div>
  );
}

function BootLogStream() {
  const logs = useAppStore((state) => state.bootLogs);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <GlassCard className="max-h-32 overflow-hidden p-0" as="div">
      <div
        className="max-h-32 overflow-y-auto px-4 py-3 font-hud text-caption leading-relaxed text-secondary"
        aria-live="polite"
        aria-label="系统日志"
      >
        {logs.map((line, index) => (
          <p
            key={`${index}-${line}`}
            className={
              line.startsWith("✓")
                ? "text-status-ok"
                : line.startsWith("!")
                  ? "text-status-warn"
                  : line.startsWith(">")
                    ? "text-accent-cyan"
                    : undefined
            }
          >
            {line}
          </p>
        ))}
        <div ref={endRef} />
      </div>
    </GlassCard>
  );
}

interface BootSelfCheckProps {
  onSkipVoice?: () => void;
}

/** MVP boot screen — orb, staggered diagnostics, progress, log stream. */
export function BootSelfCheck({ onSkipVoice }: BootSelfCheckProps) {
  const checks = useAppStore((state) => state.selfChecks);
  const visualBoot = readVisualSnapshotId() === "boot";

  return (
    <section
      data-testid="boot-self-check"
      className="relative flex h-full min-h-[560px] flex-col overflow-hidden"
    >
      <div className="boot-ambient pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-10 px-8 py-10 lg:flex-row lg:items-center lg:justify-center lg:gap-20">
        <NeuralCoreOrb />

        <div className="w-full max-w-lg space-y-5">
          <header className="text-center lg:text-left">
            <h1 className="font-hud text-display font-medium uppercase tracking-hud text-accent-cyan">
              INITIALIZING SECOND BRAIN
            </h1>
            <p className="mt-3 text-h2 font-medium text-primary">系统自检</p>
            <p className="mt-2 text-body text-secondary">
              正在确认语音、网络与本地大脑是否就绪…
            </p>
          </header>

          {visualBoot ? (
            <VisualBootDiagnostics />
          ) : (
            <GlassCard active className="p-4" data-testid="boot-diagnostics">
              <p className="mb-3 font-hud text-label uppercase tracking-hud text-muted">
                诊断清单
              </p>
              <ul className="space-y-1">
                {checks.map((item, index) => (
                  <BootCheckRow key={item.id} item={item} index={index} />
                ))}
              </ul>
            </GlassCard>
          )}
        </div>
      </div>

      <footer className="relative z-10 mx-auto w-full max-w-3xl space-y-4 px-6 pb-8">
        {onSkipVoice ? (
          <div className="flex justify-end">
            <button
              type="button"
              data-testid="boot-skip-voice"
              className="font-hud text-caption uppercase tracking-hud text-muted transition-colors hover:text-accent-cyan"
              onClick={onSkipVoice}
            >
              跳过语音播报
            </button>
          </div>
        ) : null}
        <BootProgressBar />
        <BootLogStream />
      </footer>
    </section>
  );
}
