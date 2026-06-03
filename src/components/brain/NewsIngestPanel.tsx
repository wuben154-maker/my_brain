import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { SuggestConfirmDialog } from "@/components/brain/SuggestConfirmDialog";
import { useNewsIngestSession } from "@/hooks/useNewsIngestSession";
/** The session-complete banner is a transient welcome, not a resident bar. */
const COMPLETION_VISIBLE_MS = 4500;
const COMPLETION_FADE_MS = 500;

export function NewsIngestPanel() {
  const [isApplying, setIsApplying] = useState(false);
  const [completionPhase, setCompletionPhase] = useState<
    "visible" | "fading" | "hidden"
  >("visible");

  const {
    currentItem,
    ingestPhase,
    explanation,
    pendingProposal,
    errorMessage,
    sessionComplete,
    isActive,
    explainCurrent,
    requestIngest,
    confirmProposal,
    rejectProposal,
    skipCurrent,
    processedCount,
    totalCount,
  } = useNewsIngestSession();

  // Auto-dismiss the "今日资讯 已处理完毕" banner: show on entry, then fade out
  // after ~5s. A fresh session (new items to process) resets it.
  useEffect(() => {
    if (!sessionComplete) {
      setCompletionPhase("visible");
      return;
    }
    const fadeTimer = window.setTimeout(
      () => setCompletionPhase("fading"),
      COMPLETION_VISIBLE_MS,
    );
    const hideTimer = window.setTimeout(
      () => setCompletionPhase("hidden"),
      COMPLETION_VISIBLE_MS + COMPLETION_FADE_MS,
    );
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [sessionComplete]);

  if (!isActive) {
    return null;
  }

  // Completion banner has timed out — nothing left to surface.
  if (sessionComplete && completionPhase === "hidden") {
    return null;
  }

  const isExplaining = ingestPhase === "explaining";
  const isConfirming = ingestPhase === "confirming";
  const busy = isExplaining || isApplying;

  const handleConfirm = async () => {
    setIsApplying(true);
    try {
      await confirmProposal();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <>
      <GlassCard
        active={isConfirming}
        className={[
          "absolute bottom-4 left-1/2 z-10 w-[min(36rem,calc(100%-13rem))] -translate-x-1/2 p-4 transition-all duration-500",
          sessionComplete && completionPhase === "fading"
            ? "translate-y-3 opacity-0"
            : "opacity-100",
        ].join(" ")}
      >
        {sessionComplete ? (
          <div className="text-center">
            <p className="font-hud text-label uppercase tracking-hud text-accent-cyan">
              今日资讯
            </p>
            <p className="mt-2 text-body text-primary">
              候选 {totalCount} 条已处理完毕，继续语音探索你的大脑星图吧。
            </p>
          </div>
        ) : currentItem ? (
          <>
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-hud text-label uppercase tracking-hud text-muted">
                  资讯 {processedCount + 1}/{totalCount} · {currentItem.sourceName}
                </p>
                <h3 className="mt-1 truncate text-h3 font-medium text-primary">
                  {currentItem.title}
                </h3>
              </div>
              <span className="shrink-0 rounded-sm border border-hud px-2 py-1 font-hud text-caption uppercase tracking-hud text-secondary">
                {currentItem.category === "github_trending" ? "GitHub" : "RSS"}
              </span>
            </header>

            {explanation ? (
              <p className="mt-3 line-clamp-4 text-body text-secondary">
                {explanation}
              </p>
            ) : (
              <p className="mt-3 text-body text-muted">
                点「讲解」用口语速览这条资讯的原理层面要点。
              </p>
            )}

            {errorMessage ? (
              <p className="mt-2 text-caption text-status-error">{errorMessage}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || isConfirming}
                onClick={() => void explainCurrent()}
                className="rounded-sm border border-hud px-3 py-2 text-body text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isExplaining ? "讲解中…" : "讲解"}
              </button>
              <button
                type="button"
                disabled={busy || isConfirming}
                onClick={() => void requestIngest()}
                className="rounded-sm bg-accent-cyan px-3 py-2 text-body font-medium text-bg-base disabled:cursor-not-allowed disabled:opacity-40"
              >
                入库?
              </button>
              <button
                type="button"
                disabled={busy || isConfirming}
                onClick={skipCurrent}
                className="rounded-sm border border-hud/60 px-3 py-2 text-body text-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                跳过
              </button>
            </div>
          </>
        ) : (
          <p className="text-body text-muted">暂无待处理资讯。</p>
        )}
      </GlassCard>

      <SuggestConfirmDialog
        open={isConfirming}
        proposals={pendingProposal ? [pendingProposal] : []}
        isBusy={isApplying}
        onConfirm={() => void handleConfirm()}
        onCancel={rejectProposal}
      />
    </>
  );
}
