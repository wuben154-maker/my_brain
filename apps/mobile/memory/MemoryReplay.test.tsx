/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("react-native", () => {
  const RN = (tag: string) =>
    function MockComponent({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) {
      return React.createElement(tag, { "data-testid": testID }, children);
    };
  return {
    View: RN("div"),
    Text: RN("span"),
    Pressable: RN("button"),
    StyleSheet: { create: (s: object) => s, hairlineWidth: 1 },
  };
});

import type { MemoryReplayResult } from "@my-brain/core";
import { MemoryReplay } from "./MemoryReplay";

const replay: MemoryReplayResult = {
  visible: true,
  outputKind: "ingest_timeline",
  frames: [
    {
      changeId: "c1",
      summary: "概念入库",
      evidenceRefs: ["graph_change:c1"],
      at: new Date().toISOString(),
    },
    {
      changeId: "c2",
      summary: "自动整理",
      evidenceRefs: ["graph_change:c2"],
      at: new Date().toISOString(),
    },
  ],
  cursor: "2026-06-15T11:00:00Z:c2",
  durationMs: 20_000,
};

describe("MemoryReplay component", () => {
  it("renders replay timeline and evidence caption", () => {
    render(<MemoryReplay replay={replay} />);
    expect(screen.getByTestId("memory-replay")).toBeTruthy();
    expect(screen.getByTestId("memory-replay-timeline")).toBeTruthy();
    expect(screen.getByTestId("memory-replay-frame-count").textContent).toContain("2 条");
    expect(screen.getByTestId("memory-replay-evidence").textContent).toContain("graph_change:c1");
  });

  it("shows empty state inside card when no frames", () => {
    render(
      <MemoryReplay
        replay={{
          visible: false,
          outputKind: "ingest_timeline",
          frames: [],
          cursor: null,
          durationMs: 20_000,
        }}
      />,
    );
    expect(screen.getByTestId("memory-replay-empty")).toBeTruthy();
  });
});
