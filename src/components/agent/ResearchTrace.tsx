import type { AgentTraceStep } from "@/agent/types";
import {
  sumTraceDurationMs,
  sumTraceTokens,
  traceStepDurationMs,
  traceStepLabel,
} from "@/lib/researchTrace";

interface ResearchTraceProps {
  trace: AgentTraceStep[];
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms} ms`;
  }
  return `${(ms / 1000).toFixed(1)} s`;
}

/** Timeline for one autonomous research run (B3). */
export function ResearchTrace({ trace }: ResearchTraceProps) {
  if (trace.length === 0) {
    return (
      <p className="text-caption text-muted" data-testid="research-trace-empty">
        暂无调研轨迹
      </p>
    );
  }

  const totalTokens = sumTraceTokens(trace);
  const totalDuration = sumTraceDurationMs(trace);

  return (
    <div className="flex flex-col gap-3" data-testid="research-trace">
      <div className="flex flex-wrap gap-3 font-hud text-caption uppercase tracking-hud text-muted">
        <span data-testid="research-trace-step-count">{trace.length} 步</span>
        <span data-testid="research-trace-duration">
          耗时 {formatDuration(totalDuration)}
        </span>
        <span data-testid="research-trace-tokens">Token {totalTokens}</span>
      </div>
      <ol className="relative space-y-3 border-l border-hud pl-4">
        {trace.map((step) => (
          <li
            key={step.stepId}
            className="relative"
            data-testid={`research-trace-step-${step.name}`}
          >
            <span
              className="absolute -left-[1.35rem] top-1.5 h-2 w-2 rounded-full bg-accent-cyan"
              aria-hidden
            />
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="text-body font-medium text-primary">
                {traceStepLabel(step.name)}
              </p>
              <span className="text-caption text-muted">
                {formatDuration(traceStepDurationMs(step))}
                {step.tokensUsed != null ? ` · ${step.tokensUsed} tok` : ""}
              </span>
            </div>
            {step.inputSummary ? (
              <p className="mt-0.5 text-caption text-secondary">
                输入：{step.inputSummary}
              </p>
            ) : null}
            {step.outputSummary ? (
              <p className="mt-0.5 text-caption text-muted">
                输出：{step.outputSummary}
              </p>
            ) : null}
            {step.error ? (
              <p className="mt-0.5 text-caption text-status-error">{step.error}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
