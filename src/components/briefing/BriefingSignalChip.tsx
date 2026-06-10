import type { BriefingFeedbackKind } from "@/domain/radar/briefingItem";
import type { RadarSignal } from "@/domain/radar/radarSignal";

interface BriefingSignalChipProps {
  signal: RadarSignal;
  className?: string;
  onFeedback?: (kind: BriefingFeedbackKind) => void;
  feedbackBusy?: boolean;
}

const FEEDBACK_OPTIONS: { kind: BriefingFeedbackKind; label: string }[] = [
  { kind: "not_interested", label: "不感兴趣" },
  { kind: "too_shallow", label: "太浅" },
  { kind: "too_deep", label: "太深" },
];

/** KOS-B3 / KP-05: visible signal + optional briefing feedback controls. */
export function BriefingSignalChip({
  signal,
  className = "",
  onFeedback,
  feedbackBusy = false,
}: BriefingSignalChipProps) {
  return (
    <div
      className={`rounded-sm border border-accent-cyan/40 bg-accent-cyan/10 px-3 py-2 text-caption text-primary ${className}`.trim()}
      data-testid={`briefing-signal-${signal.worldItemId}`}
      data-reason-code={signal.reasonCode}
    >
      <span className="font-hud text-caption uppercase tracking-hud text-accent-cyan">
        为什么和我有关
      </span>
      <span className="mt-1 block">{signal.explanation}</span>
      {onFeedback ? (
        <div
          className="mt-2 flex flex-wrap gap-2"
          data-testid={`briefing-feedback-${signal.worldItemId}`}
        >
          {FEEDBACK_OPTIONS.map((option) => (
            <button
              key={option.kind}
              type="button"
              className="rounded border border-white/15 px-2 py-0.5 text-caption text-secondary hover:border-accent-cyan/40 hover:text-primary disabled:opacity-40"
              disabled={feedbackBusy}
              data-testid={`briefing-feedback-${signal.worldItemId}-${option.kind}`}
              onClick={(event) => {
                event.stopPropagation();
                onFeedback(option.kind);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
