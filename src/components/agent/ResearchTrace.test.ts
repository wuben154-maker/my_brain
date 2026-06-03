/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ResearchTrace } from "@/components/agent/ResearchTrace";
import type { AgentTraceStep } from "@/agent/types";

const trace: AgentTraceStep[] = [
  {
    stepId: "s1",
    name: "plan",
    startedAt: "2026-06-01T08:00:00.000Z",
    finishedAt: "2026-06-01T08:00:01.000Z",
    tokensUsed: 120,
    outputSummary: "3 sub-questions",
  },
  {
    stepId: "s2",
    name: "synthesize",
    startedAt: "2026-06-01T08:00:01.000Z",
    finishedAt: "2026-06-01T08:00:02.000Z",
    tokensUsed: 280,
    outputSummary: "2 concept candidates",
  },
];

describe("ResearchTrace (B3)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders ordered steps with duration and token totals", () => {
    render(createElement(ResearchTrace, { trace }));
    expect(screen.getByTestId("research-trace")).toBeTruthy();
    expect(screen.getByTestId("research-trace-step-count").textContent).toBe(
      "2 步",
    );
    expect(screen.getByTestId("research-trace-tokens").textContent).toContain(
      "400",
    );
    expect(screen.getByTestId("research-trace-step-plan")).toBeTruthy();
    expect(screen.getByTestId("research-trace-step-synthesize")).toBeTruthy();
  });

  it("shows empty state when trace is empty", () => {
    render(createElement(ResearchTrace, { trace: [] }));
    expect(screen.getByTestId("research-trace-empty")).toBeTruthy();
  });
});
