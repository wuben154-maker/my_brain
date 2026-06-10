import { useCallback, useState } from "react";
import { BriefingSignalChip } from "@/components/briefing/BriefingSignalChip";
import { buildProfileTeachingRationale } from "@/conversation/teachingDepth";
import {
  getBriefingItemNewsId,
  primaryBriefingSignal,
  type BriefingFeedbackKind,
  type BriefingItem,
} from "@/domain/radar/briefingItem";
import { useAppStore } from "@/stores/appStore";
import { useBriefingStore } from "@/stores/briefingStore";
import { useIngestStore } from "@/stores/ingestStore";
import { useProfileStore } from "@/stores/profileStore";

function focusBriefingItem(item: BriefingItem, queueLength: number): void {
  const newsId = getBriefingItemNewsId(item);
  const newsQueue = useAppStore.getState().newsQueue;
  const index = newsQueue.findIndex((entry) => entry.id === newsId);
  if (index < 0 || index >= queueLength) {
    return;
  }
  const store = useIngestStore.getState();
  store.setCursor(index);
  store.setActiveNewsId(newsId);
}

function isBriefingItemHighlighted(item: BriefingItem, cursor: number): boolean {
  const newsId = getBriefingItemNewsId(item);
  const newsQueue = useAppStore.getState().newsQueue;
  const index = newsQueue.findIndex((entry) => entry.id === newsId);
  return index >= 0 && cursor === index;
}

/** KP-02 / KP-05: Radar top 3 + signal explanations + feedback inside companion shell. */
export function RadarCompanionCard() {
  const todayItems = useBriefingStore((state) => state.todayItems);
  const recordFeedback = useBriefingStore((state) => state.recordFeedback);
  const profile = useProfileStore((state) => state.profile);
  const storage = useAppStore((state) => state.storage);
  const cursor = useIngestStore((state) => state.cursor);
  const newsQueue = useAppStore((state) => state.newsQueue);
  const [expandedRationaleId, setExpandedRationaleId] = useState<string | null>(
    null,
  );
  const [feedbackBusyId, setFeedbackBusyId] = useState<string | null>(null);

  const handleFeedback = useCallback(
    async (worldItemId: string, kind: BriefingFeedbackKind) => {
      setFeedbackBusyId(worldItemId);
      try {
        await recordFeedback({ kind, worldItemId }, storage);
      } finally {
        setFeedbackBusyId(null);
      }
    },
    [recordFeedback, storage],
  );

  if (todayItems.length === 0) {
    return (
      <div data-testid="radar-companion-card" className="text-body text-secondary">
        <p>今天没有足够相关的新变化</p>
        <p className="mt-2 text-caption text-muted">
          可以补充兴趣画像，或稍后再看今日 Radar。
        </p>
      </div>
    );
  }

  return (
    <div data-testid="radar-companion-card" className="flex flex-col gap-3">
      <p className="text-caption text-muted">今日 3 条与你最相关的变化</p>
      <ul className="flex flex-col gap-3">
        {todayItems.slice(0, 3).map((item) => {
          const signal = primaryBriefingSignal(item);
          const highlighted = isBriefingItemHighlighted(item, cursor);
          const rationaleOpen = expandedRationaleId === item.worldItem.id;
          const rationaleLines = buildProfileTeachingRationale(profile, signal);

          return (
            <li key={item.worldItem.id}>
              <div
                data-testid={`radar-companion-item-${item.briefingRank}`}
                data-highlighted={highlighted ? "true" : "false"}
                className={`w-full rounded-md border p-3 text-left transition ${
                  highlighted
                    ? "border-accent-cyan/70 bg-accent-cyan/10 shadow-glow-soft"
                    : "border-hud/60 bg-bg-base/20"
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left hover:opacity-90"
                  onClick={() => focusBriefingItem(item, newsQueue.length)}
                >
                  <p className="font-hud text-caption uppercase tracking-hud text-muted">
                    #{item.briefingRank}
                  </p>
                  <h3 className="mt-1 text-h3 font-medium text-primary">
                    {item.worldItem.title}
                  </h3>
                </button>
                {signal ? (
                  <BriefingSignalChip
                    signal={signal}
                    className="mt-2"
                    feedbackBusy={feedbackBusyId === item.worldItem.id}
                    onFeedback={(kind) =>
                      void handleFeedback(item.worldItem.id, kind)
                    }
                  />
                ) : null}
                <button
                  type="button"
                  data-testid={`radar-why-link-${item.worldItem.id}`}
                  className="mt-2 text-caption text-accent-cyan hover:underline"
                  onClick={() =>
                    setExpandedRationaleId((current) =>
                      current === item.worldItem.id ? null : item.worldItem.id,
                    )
                  }
                >
                  为何推荐 / 讲解
                </button>
                {rationaleOpen ? (
                  <ul
                    className="mt-2 list-none space-y-1 text-caption text-secondary"
                    data-testid={`radar-rationale-${item.worldItem.id}`}
                  >
                    {rationaleLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
