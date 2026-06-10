import { WeeklyReviewBody } from "@/components/review/WeeklyReviewBody";
import { useWeeklyReviewStore } from "@/stores/weeklyReviewStore";

/** Legacy auxiliary overlay — prefer CompanionShell review slot (KP-03). */
export function WeeklyReviewOverlay() {
  const open = useWeeklyReviewStore((state) => state.open);
  const companionOpen = useWeeklyReviewStore((state) => state.companionOpen);
  const review = useWeeklyReviewStore((state) => state.review);
  const closeReview = useWeeklyReviewStore((state) => state.closeReview);

  if (!open || companionOpen || !review) {
    return null;
  }

  return (
    <div
      data-testid="weekly-review-overlay"
      role="region"
      aria-label="每周脑图回顾"
      className="pointer-events-auto absolute inset-x-4 bottom-20 z-30 mx-auto max-w-2xl rounded-lg border border-emerald-500/35 bg-bg-elevated/90 p-4 text-body shadow-lg backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-caption uppercase tracking-wide text-emerald-300/80">
            每周脑图回顾
          </p>
          <h2 className="mt-1 text-h3 text-primary">每周脑图回顾</h2>
        </div>
        <button
          type="button"
          data-testid="weekly-review-close"
          aria-label="关闭每周回顾"
          onClick={() => closeReview()}
          className="rounded-md px-2 py-1 text-caption text-secondary transition hover:text-primary"
        >
          关闭
        </button>
      </div>

      <div className="mt-3">
        <WeeklyReviewBody review={review} />
      </div>
    </div>
  );
}
