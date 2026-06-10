import { citationKey } from "@/domain/review/weeklyBrainReview";
import type { WeeklyBrainReview } from "@/domain/review/weeklyBrainReview";

export interface WeeklyReviewBodyProps {
  review: WeeklyBrainReview;
  /** Prefix for data-testid attributes (overlay vs companion). */
  testIdPrefix?: "weekly-review" | "weekly-review-companion";
}

/** Shared read-only weekly review sections + citations (KOS-D3 / KP-03). */
export function WeeklyReviewBody({
  review,
  testIdPrefix = "weekly-review",
}: WeeklyReviewBodyProps) {
  return (
    <>
      <div
        data-testid={`${testIdPrefix}-week-id`}
        className="text-h3 text-primary"
      >
        {review.weekId}
      </div>

      <div
        data-testid={`${testIdPrefix}-markdown`}
        className="mt-3 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md border border-white/10 bg-black/20 p-3 text-caption text-secondary"
      >
        {review.markdown}
      </div>

      <ul
        data-testid={`${testIdPrefix}-sections`}
        className="mt-3 max-h-[36vh] space-y-3 overflow-y-auto"
      >
        {review.sections.map((section) => (
          <li
            key={section.kind}
            data-testid={`${testIdPrefix}-section-${section.kind}`}
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
                      data-testid={`${testIdPrefix}-citation-${citation.type}-${citation.id}`}
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
    </>
  );
}
