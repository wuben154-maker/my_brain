/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BriefingSignalChip } from "@/components/briefing/BriefingSignalChip";
import type { RadarSignal } from "@/domain/radar/radarSignal";

const sampleSignal: RadarSignal = {
  worldItemId: "radar-wi-rel-1",
  reasonCode: "graph_concept_overlap",
  explanation: "与你图谱中的 AI Agent、MCP 相关。",
  linkedNodeIds: ["demo-agent", "demo-mcp"],
  score: 0.9,
};

describe("BriefingSignalChip", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the radar signal explanation", () => {
    render(createElement(BriefingSignalChip, { signal: sampleSignal }));
    const chip = screen.getByTestId("briefing-signal-radar-wi-rel-1");
    expect(chip.textContent).toContain("为什么和我有关");
    expect(chip.textContent).toContain(sampleSignal.explanation);
  });
});
