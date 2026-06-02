import type { AgentJob, AgentRunResult, AgentTraceStep } from "./types";

export class AgentRunAbortedError extends Error {
  constructor(message = "Agent run aborted") {
    super(message);
    this.name = "AgentRunAbortedError";
  }
}

export function createAgentRunId(): string {
  return `run-${crypto.randomUUID()}`;
}

export function assertNotAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new AgentRunAbortedError();
  }
}

export interface TraceStepDraft {
  stepId: string;
  name: string;
  startedAt: string;
  inputSummary?: string;
}

export function beginTraceStep(
  name: string,
  inputSummary?: string,
): TraceStepDraft {
  return {
    stepId: `step-${crypto.randomUUID()}`,
    name,
    startedAt: new Date().toISOString(),
    inputSummary,
  };
}

export function finishTraceStep(
  draft: TraceStepDraft,
  outputSummary?: string,
  tokensUsed?: number,
  error?: string,
): AgentTraceStep {
  return {
    stepId: draft.stepId,
    name: draft.name,
    startedAt: draft.startedAt,
    finishedAt: new Date().toISOString(),
    inputSummary: draft.inputSummary,
    outputSummary,
    tokensUsed,
    error,
  };
}

/** Execute one AgentJob — kernel entry; jobs own trace/result assembly. */
export async function runAgentJob(
  job: AgentJob,
  tools: Parameters<AgentJob["run"]>[0],
  signal: AbortSignal = new AbortController().signal,
): Promise<AgentRunResult> {
  assertNotAborted(signal);
  const result = await job.run(tools, signal);
  assertNotAborted(signal);
  return result;
}
