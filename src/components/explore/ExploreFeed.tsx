import { useCallback, useState } from "react";
import { SuggestConfirmDialog } from "@/components/brain/SuggestConfirmDialog";
import { NewsCard } from "@/components/explore/NewsCard";
import { newsItemStatus } from "@/components/explore/newsItemStatus";
import { GlassCard } from "@/components/ui/GlassCard";
import { useNewsIngestSession } from "@/hooks/useNewsIngestSession";
import { useAppStore } from "@/stores/appStore";
import { useIngestStore } from "@/stores/ingestStore";

function focusNewsItem(itemId: string, queueLength: number): void {
  const newsQueue = useAppStore.getState().newsQueue;
  const index = newsQueue.findIndex((item) => item.id === itemId);
  if (index < 0 || index >= queueLength) {
    return;
  }
  const store = useIngestStore.getState();
  store.setCursor(index);
  store.setActiveNewsId(itemId);
}

/** Explore nav partition — full news queue with ingest actions (N1). */
export function ExploreFeed() {
  const newsQueue = useAppStore((state) => state.newsQueue);
  const skippedIds = useIngestStore((state) => state.skippedIds);
  const ingestedIds = useIngestStore((state) => state.ingestedIds);
  const activeNewsId = useIngestStore((state) => state.activeNewsId);
  const [isApplying, setIsApplying] = useState(false);

  const {
    currentItem,
    ingestPhase,
    explanation,
    pendingProposal,
    explainCurrent,
    requestIngest,
    confirmProposal,
    rejectProposal,
    skipCurrent,
  } = useNewsIngestSession();

  const isConfirming = ingestPhase === "confirming";
  const busy = ingestPhase === "explaining" || isApplying;

  const handleConfirm = async () => {
    setIsApplying(true);
    try {
      await confirmProposal();
    } finally {
      setIsApplying(false);
    }
  };

  const runOnItem = useCallback(
    (itemId: string, action: () => void | Promise<void>) => {
      focusNewsItem(itemId, newsQueue.length);
      void action();
    },
    [newsQueue.length],
  );

  if (newsQueue.length === 0) {
    return (
      <section
        className="flex min-h-0 flex-1 flex-col"
        data-testid="section-explore"
      >
        <GlassCard
          className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center"
          data-testid="explore-feed-empty"
        >
          <p className="text-h2 text-primary">今日无新候选，已是最新</p>
          <p className="text-caption text-muted">
            启动时抓取的 RSS 与 GitHub 趋势会出现在这里。
          </p>
        </GlassCard>
      </section>
    );
  }

  return (
    <section
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
      data-testid="section-explore"
    >
      <header>
        <p className="font-hud text-caption uppercase tracking-hud text-accent-cyan">
          探索
        </p>
        <h2 className="text-h2 text-primary">今日资讯</h2>
        <p className="mt-1 text-caption text-muted">
          共 {newsQueue.length} 条候选 · 讲解与入库均不会保存原文
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {newsQueue.map((item) => (
          <li key={item.id}>
            <NewsCard
              item={item}
              status={newsItemStatus(item, ingestedIds, skippedIds)}
              explanation={
                currentItem?.id === item.id ? explanation : undefined
              }
              busy={busy && currentItem?.id === item.id}
              confirming={isConfirming && activeNewsId === item.id}
              onExplain={() => runOnItem(item.id, explainCurrent)}
              onIngest={() => runOnItem(item.id, requestIngest)}
              onSkip={() => {
                focusNewsItem(item.id, newsQueue.length);
                if (currentItem?.id === item.id) {
                  skipCurrent();
                } else {
                  useIngestStore.getState().markSkipped(item.id);
                }
              }}
            />
          </li>
        ))}
      </ul>

      <SuggestConfirmDialog
        open={isConfirming}
        proposals={pendingProposal ? [pendingProposal] : []}
        isBusy={isApplying}
        onConfirm={() => void handleConfirm()}
        onCancel={rejectProposal}
      />
    </section>
  );
}
