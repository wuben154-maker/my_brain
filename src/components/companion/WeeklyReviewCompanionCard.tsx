import { useMemo } from "react";
import { wrapWeeklyReviewAsAction } from "@/actions/wrapWeeklyReviewAsAction";
import { WeeklyReviewBody } from "@/components/review/WeeklyReviewBody";
import { useWeeklyReviewStore } from "@/stores/weeklyReviewStore";

function hasReviewableHistory(
  review: NonNullable<ReturnType<typeof useWeeklyReviewStore.getState>["review"]>,
): boolean {
  return review.citations.some((citation) => citation.type === "historyEntry");
}

/** KP-03: full Weekly Review body inside companion shell review slot. */
export function WeeklyReviewCompanionCard() {
  const review = useWeeklyReviewStore((state) => state.review);

  const actionDraft = useMemo(
    () => (review ? wrapWeeklyReviewAsAction(review) : null),
    [review],
  );

  if (!review) {
    return (
      <div data-testid="weekly-review-companion-card" className="text-body text-secondary">
        <p>本周还没有可回顾的图谱变化</p>
        <p className="mt-2 text-caption text-muted">
          确认入库或完成自动整理后，再打开每周回顾。
        </p>
      </div>
    );
  }

  if (!hasReviewableHistory(review)) {
    return (
      <div data-testid="weekly-review-companion-card" className="text-body text-secondary">
        <p>本周还没有可回顾的图谱变化</p>
        <p className="mt-2 text-caption text-muted">
          回顾窗口内没有图谱结构变更；不会编造节点名称。
        </p>
      </div>
    );
  }

  return (
    <div data-testid="weekly-review-companion-card" className="flex flex-col gap-3">
      <WeeklyReviewBody review={review} testIdPrefix="weekly-review-companion" />

      {actionDraft ? (
        <div
          data-testid="weekly-review-action-draft"
          className="rounded-md border border-amber-500/30 bg-amber-950/20 p-3"
        >
          <p
            data-testid="weekly-review-draft-only-label"
            className="text-caption font-medium text-amber-200"
          >
            行动草稿 · 仅建议（draft-only）
          </p>
          <p className="mt-1 text-caption text-secondary">{actionDraft.title}</p>
          <p className="mt-1 text-xs text-muted">
            状态：{actionDraft.status} · 权限：{actionDraft.permissionLevel}
          </p>
        </div>
      ) : null}
    </div>
  );
}
