/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BriefingSignalChip } from "@/components/briefing/BriefingSignalChip";
import type { RadarSignal } from "@/domain/radar/radarSignal";
import { useBriefingStore } from "@/stores/briefingStore";

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
    useBriefingStore.getState().clear();
  });

  beforeEach(() => {
    useBriefingStore.getState().clear();
  });

  it("renders the radar signal explanation", () => {
    render(createElement(BriefingSignalChip, { signal: sampleSignal }));
    const chip = screen.getByTestId("briefing-signal-radar-wi-rel-1");
    expect(chip.textContent).toContain("为什么和我有关");
    expect(chip.textContent).toContain(sampleSignal.explanation);
  });

  it("calls onFeedback when a feedback chip is clicked", () => {
    const onFeedback = vi.fn();
    render(
      createElement(BriefingSignalChip, { signal: sampleSignal, onFeedback }),
    );
    fireEvent.click(
      screen.getByTestId("briefing-feedback-radar-wi-rel-1-not_interested"),
    );
    expect(onFeedback).toHaveBeenCalledWith("not_interested");
  });
});
