import type { RadarSignal } from "@/domain/radar/radarSignal";

interface BriefingSignalChipProps {
  signal: RadarSignal;
  className?: string;
}

/** KOS-B3: visible「为什么和我有关」explanation chip for radar briefing items. */
export function BriefingSignalChip({ signal, className = "" }: BriefingSignalChipProps) {
  return (
    <p
      className={`rounded-sm border border-accent-cyan/40 bg-accent-cyan/10 px-3 py-2 text-caption text-primary ${className}`.trim()}
      data-testid={`briefing-signal-${signal.worldItemId}`}
      data-reason-code={signal.reasonCode}
    >
      <span className="font-hud text-caption uppercase tracking-hud text-accent-cyan">
        为什么和我有关
      </span>
      <span className="mt-1 block">{signal.explanation}</span>
    </p>
  );
}
