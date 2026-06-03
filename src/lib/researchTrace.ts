import type { AgentTraceStep } from "@/agent/types";

const STEP_LABELS: Record<string, string> = {
  plan: "研究计划",
  gather: "搜集证据",
  synthesize: "提炼概念",
  propose: "生成提议",
  fetchNews: "拉取资讯",
  dedupeAgainstGraph: "图谱去重",
  summarize: "摘要",
  budget_truncated: "预算截断",
  step_limit_truncated: "步数截断",
  budget_day_cap: "日预算上限",
};

export function traceStepLabel(name: string): string {
  return STEP_LABELS[name] ?? name;
}

export function traceStepDurationMs(step: AgentTraceStep): number {
  const start = Date.parse(step.startedAt);
  const end = Date.parse(step.finishedAt);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }
  return Math.max(0, end - start);
}

export function sumTraceTokens(steps: AgentTraceStep[]): number {
  return steps.reduce((total, step) => total + (step.tokensUsed ?? 0), 0);
}

export function sumTraceDurationMs(steps: AgentTraceStep[]): number {
  if (steps.length === 0) {
    return 0;
  }
  const first = Date.parse(steps[0]!.startedAt);
  const last = Date.parse(steps[steps.length - 1]!.finishedAt);
  if (Number.isNaN(first) || Number.isNaN(last)) {
    return steps.reduce((total, step) => total + traceStepDurationMs(step), 0);
  }
  return Math.max(0, last - first);
}
