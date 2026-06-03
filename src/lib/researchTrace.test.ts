import { describe, expect, it } from "vitest";
import type { AgentTraceStep } from "@/agent/types";
import {
  sumTraceDurationMs,
  sumTraceTokens,
  traceStepDurationMs,
  traceStepLabel,
} from "@/lib/researchTrace";

const sampleSteps: AgentTraceStep[] = [
  {
    stepId: "s1",
    name: "plan",
    startedAt: "2026-06-01T08:00:00.000Z",
    finishedAt: "2026-06-01T08:00:01.500Z",
    tokensUsed: 120,
    outputSummary: "3 sub-questions",
  },
  {
    stepId: "s2",
    name: "gather",
    startedAt: "2026-06-01T08:00:01.500Z",
    finishedAt: "2026-06-01T08:00:02.000Z",
    tokensUsed: 40,
    outputSummary: "5 evidence lines",
  },
];

describe("researchTrace helpers", () => {
  it("maps known step names to Chinese labels", () => {
    expect(traceStepLabel("plan")).toBe("研究计划");
    expect(traceStepLabel("unknown_step")).toBe("unknown_step");
  });

  it("sums token usage across steps", () => {
    expect(sumTraceTokens(sampleSteps)).toBe(160);
  });

  it("computes per-step and total duration", () => {
    expect(traceStepDurationMs(sampleSteps[0]!)).toBe(1500);
    expect(sumTraceDurationMs(sampleSteps)).toBe(2000);
  });
});
