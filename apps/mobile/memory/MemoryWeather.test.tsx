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

import type { MemoryWeatherResult } from "@my-brain/core";
import { MemoryWeather } from "./MemoryWeather";

const weather: MemoryWeatherResult = {
  visible: true,
  cards: [
    {
      outputKind: "trend",
      headline: "Realtime API 趋势入库",
      detail: "图谱变化",
      evidenceRefs: ["graph_change:chg-1"],
      confidence: 0.9,
    },
  ],
};

describe("MemoryWeather component", () => {
  it("renders evidence-backed headline", () => {
    render(<MemoryWeather weather={weather} />);
    expect(screen.getByTestId("memory-weather")).toBeTruthy();
    expect(screen.getByTestId("memory-weather-headline").textContent).toContain("Realtime");
    expect(screen.getByTestId("memory-weather-evidence").textContent).toContain("graph_change:chg-1");
  });

  it("shows empty state inside card without evidence", () => {
    render(<MemoryWeather weather={{ visible: false, cards: [] }} />);
    expect(screen.getByTestId("memory-weather-empty")).toBeTruthy();
  });
});
