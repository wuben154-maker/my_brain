import type { NewsItem } from "@/domain/news";
import type { RadarSignal } from "@/domain/radar/radarSignal";
import { BriefingSignalChip } from "@/components/briefing/BriefingSignalChip";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  NEWS_ITEM_STATUS_LABELS,
  type NewsItemStatus,
} from "@/components/explore/newsItemStatus";

interface NewsCardProps {
  item: NewsItem;
  status: NewsItemStatus;
  explanation?: string;
  briefingSignal?: RadarSignal;
  busy: boolean;
  confirming: boolean;
  onExplain: () => void;
  onIngest: () => void;
  onSkip: () => void;
}

export function NewsCard({
  item,
  status,
  explanation,
  briefingSignal,
  busy,
  confirming,
  onExplain,
  onIngest,
  onSkip,
}: NewsCardProps) {
  const done = status !== "pending";

  return (
    <GlassCard
      className="flex flex-col gap-3 p-4"
      data-testid={`news-card-${item.id}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-hud text-caption uppercase tracking-hud text-muted">
            {item.sourceName}
            {item.publishedAt
              ? ` · ${new Date(item.publishedAt).toLocaleDateString("zh-CN")}`
              : ""}
          </p>
          <h3 className="mt-1 text-h3 font-medium text-primary">{item.title}</h3>
        </div>
        <span
          className="shrink-0 rounded-sm border border-hud px-2 py-1 font-hud text-caption uppercase tracking-hud text-secondary"
          data-testid={`news-card-status-${item.id}`}
        >
          {NEWS_ITEM_STATUS_LABELS[status]}
        </span>
      </header>

      <p className="line-clamp-3 text-body text-secondary">{item.summary}</p>

      {briefingSignal ? <BriefingSignalChip signal={briefingSignal} /> : null}

      {explanation ? (
        <p className="rounded-sm border border-hud/60 bg-bg-elevated/40 p-3 text-caption text-primary">
          {explanation}
        </p>
      ) : null}

      {!done ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || confirming}
            onClick={onExplain}
            className="rounded-sm border border-hud px-3 py-2 text-body text-primary disabled:opacity-40"
          >
            讲解
          </button>
          <button
            type="button"
            disabled={busy || confirming}
            onClick={onIngest}
            className="rounded-sm bg-accent-cyan px-3 py-2 text-body font-medium text-bg-base disabled:opacity-40"
          >
            入库?
          </button>
          <button
            type="button"
            disabled={busy || confirming}
            onClick={onSkip}
            className="rounded-sm border border-hud/60 px-3 py-2 text-body text-muted disabled:opacity-40"
          >
            跳过
          </button>
        </div>
      ) : null}
    </GlassCard>
  );
}
