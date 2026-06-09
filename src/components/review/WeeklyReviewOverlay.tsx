import { citationKey } from "@/domain/review/weeklyBrainReview";
import { useWeeklyReviewStore } from "@/stores/weeklyReviewStore";

/** KOS-D3 — read-only weekly review overlay (sections + markdown + citations). */
export function WeeklyReviewOverlay() {
  const open = useWeeklyReviewStore((state) => state.open);
  const review = useWeeklyReviewStore((state) => state.review);
  const closeReview = useWeeklyReviewStore((state) => state.closeReview);

  if (!open || !review) {
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
          <h2 className="mt-1 text-h3 text-primary" data-testid="weekly-review-week-id">
            {review.weekId}
          </h2>
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

      <div
        data-testid="weekly-review-markdown"
        className="mt-3 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md border border-white/10 bg-black/20 p-3 text-caption text-secondary"
      >
        {review.markdown}
      </div>

      <ul
        data-testid="weekly-review-sections"
        className="mt-3 max-h-[36vh] space-y-3 overflow-y-auto"
      >
        {review.sections.map((section) => (
          <li
            key={section.kind}
            data-testid={`weekly-review-section-${section.kind}`}
            className="rounded-md border border-white/10 bg-black/20 p-3"
          >
            <h3 className="text-sm font-medium text-primary">{section.title}</h3>
            <p className="mt-1 whitespace-pre-wrap text-caption text-secondary">
              {section.body}
            </p>
            {section.citationKeys.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {section.citationKeys.map((key) => {
                  const citation = review.citations.find(
                    (row) => citationKey(row.type, row.id) === key,
                  );
                  if (!citation) {
                    return null;
                  }
                  return (
                    <span
                      key={key}
                      data-testid={`weekly-review-citation-${citation.type}-${citation.id}`}
                      className="rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-xs text-emerald-100"
                    >
                      {citation.label}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
