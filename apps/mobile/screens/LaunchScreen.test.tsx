/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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

  class MockAnimatedValue {
    constructor(public value: number) {}
    interpolate() {
      return this.value;
    }
  }

  const Animated = {
    Value: MockAnimatedValue,
    View: RN("div"),
    Text: RN("span"),
    timing: () => ({ start: (cb?: () => void) => cb?.() }),
    parallel: (items: Array<{ start: (cb?: () => void) => void }>) => ({
      start: (cb?: () => void) => {
        items.forEach((item) => item.start());
        cb?.();
      },
    }),
  };

  return {
    View: RN("div"),
    Text: RN("span"),
    Animated,
    StyleSheet: { create: (s: object) => s },
  };
});

import { LAUNCH_MAX_MS, LAUNCH_MIN_MS, LaunchScreen } from "./LaunchScreen";

describe("LaunchScreen", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("timing contract keeps min <= max", () => {
    expect(LAUNCH_MIN_MS).toBeLessThanOrEqual(LAUNCH_MAX_MS);
    expect(LAUNCH_MIN_MS).toBe(1200);
    expect(LAUNCH_MAX_MS).toBe(1800);
  });

  it("shows brand tagline matching splash contract", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<LaunchScreen onDone={onDone} />);

    expect(screen.getByTestId("launch-screen")).toBeTruthy();
    expect(screen.getByTestId("launch-brand").textContent).toBe("my_brain");
    expect(screen.getByTestId("launch-tagline").textContent).toBe("你的大脑，慢慢亮起来");
  });

  it("does not render boot sequence or HUD copy", () => {
    vi.useFakeTimers();
    render(<LaunchScreen onDone={vi.fn()} />);

    expect(screen.queryByTestId("boot-sequence")).toBeNull();
    expect(screen.queryByTestId("launch-progress")).toBeNull();
    expect(screen.queryByText(/BOOT/i)).toBeNull();
    expect(screen.queryByText(/SEQUENCE/i)).toBeNull();
  });

  it("renders star core and splash footer micro copy", () => {
    vi.useFakeTimers();
    render(<LaunchScreen onDone={vi.fn()} />);

    expect(screen.getByTestId("launch-star-core")).toBeTruthy();
    expect(screen.getByTestId("launch-footer-micro").textContent).toBe(
      "本地优先 · 用户确认入库 · 可撤销整理",
    );
  });

  it("does not hand off before minimum visible time", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<LaunchScreen onDone={onDone} />);

    vi.advanceTimersByTime(LAUNCH_MIN_MS - 1);
    expect(onDone).not.toHaveBeenCalled();
  });

  it("hands off within max wait", () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<LaunchScreen onDone={onDone} />);

    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(LAUNCH_MAX_MS - 1);
    expect(onDone).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
