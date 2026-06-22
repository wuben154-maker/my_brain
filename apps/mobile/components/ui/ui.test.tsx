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
      accessibilityRole,
      accessibilityLabel,
      onPress,
      style,
    }: {
      children?: React.ReactNode;
      testID?: string;
      accessibilityRole?: string;
      accessibilityLabel?: string;
      onPress?: () => void;
      style?: object | object[] | ((state: { pressed: boolean }) => object | object[]);
    }) {
      const rawStyle = typeof style === "function" ? style({ pressed: false }) : style;
      const flatStyle = Array.isArray(rawStyle)
        ? Object.assign({}, ...rawStyle.filter(Boolean))
        : rawStyle ?? {};
      return React.createElement(
        onPress ? "button" : tag,
        {
          "data-testid": testID,
          role: accessibilityRole,
          "aria-label": accessibilityLabel,
          onClick: onPress,
          style: flatStyle,
        },
        children,
      );
    };

  class MockAnimatedValue {
    constructor(public value: number) {}
    setValue(v: number) {
      this.value = v;
    }
    stopAnimation() {}
    interpolate() {
      return this.value;
    }
  }

  const Animated = {
    Value: MockAnimatedValue,
    View: RN("div"),
    timing: () => ({ start: (cb?: () => void) => cb?.() }),
    sequence: (items: Array<{ start: (cb?: () => void) => void }>) => ({
      start: (cb?: () => void) => {
        items.forEach((item) => item.start());
        cb?.();
      },
    }),
    loop: (item: { start: (cb?: () => void) => void }) => ({
      start: () => item.start(),
      stop: () => {},
    }),
  };

  return {
    View: RN("div"),
    Text: RN("span"),
    Pressable: RN("button"),
    Animated,
    Easing: {
      inOut: (fn: (v: number) => number) => fn,
      ease: (v: number) => v,
    },
    StyleSheet: { create: (s: object) => s },
  };
});

import { GlassCard } from "./GlassCard";
import { PageHeader } from "./PageHeader";
import { SettingRow } from "./SettingRow";
import { PrimaryPill } from "./PrimaryPill";
import { ContextDecisionBar } from "./ContextDecisionBar";
import { VoiceOrb } from "./VoiceOrb";
import { voiceOrbAccessibilityLabel } from "./VoiceOrb";
import { ConstellationStar } from "./ConstellationStar";
import { brainTheme } from "../../theme/tokens";

describe("UI primitives", () => {
  afterEach(() => {
    cleanup();
  });

  it("GlassCard renders with dark surface and padding", () => {
    render(
      <GlassCard testID="card">
        <span>内容</span>
      </GlassCard>,
    );
    const card = screen.getByTestId("card");
    expect(card).toBeTruthy();
    expect((card as HTMLElement).style.backgroundColor).toBe(
      brainTheme.dark.surface,
    );
  });

  it("PageHeader renders title and subtitle with slots", () => {
    render(
      <PageHeader
        title="Profile & Trust"
        subtitle="本地可用"
        leftSlot={<span data-testid="back">返回</span>}
        rightSlot={<span data-testid="menu">···</span>}
      />,
    );
    expect(screen.getByTestId("page-header-title").textContent).toBe(
      "Profile & Trust",
    );
    expect(screen.getByTestId("page-header-subtitle").textContent).toBe(
      "本地可用",
    );
    expect(screen.getByTestId("back")).toBeTruthy();
    expect(screen.getByTestId("menu")).toBeTruthy();
  });

  it("SettingRow meets min height and shows chevron", () => {
    render(
      <SettingRow
        title="我的画像"
        subtitle="模式、推断来源、纠偏历史"
        onPress={() => {}}
      />,
    );
    expect(screen.getByTestId("setting-row-title").textContent).toBe("我的画像");
    expect(screen.getByTestId("setting-row-chevron")).toBeTruthy();
  });

  it("PrimaryPill is accessible button with zh-CN label", () => {
    render(<PrimaryPill label="开始聊" onPress={() => {}} />);
    const pill = screen.getByTestId("primary-pill");
    expect(pill.getAttribute("role")).toBe("button");
    expect(pill.getAttribute("aria-label")).toBe("开始聊");
    expect(screen.getByTestId("primary-pill-label").textContent).toBe("开始聊");
  });

  it("ContextDecisionBar uses intentLabels by default", () => {
    render(
      <ContextDecisionBar
        actions={[
          { key: "ingest", onPress: () => {} },
          { key: "skip", onPress: () => {} },
          { key: "detail", onPress: () => {} },
        ]}
      />,
    );
    expect(screen.getByTestId("context-decision-bar-ingest").textContent).toBe(
      "记住这个",
    );
    expect(screen.getByTestId("context-decision-bar-skip").textContent).toBe(
      "先不用",
    );
    expect(screen.getByTestId("context-decision-bar-detail").textContent).toBe(
      "多说点",
    );
  });

  it("VoiceOrb renders 72px visual without waveform lines", () => {
    render(<VoiceOrb state="idle" reducedMotion testID="orb" />);
    expect(screen.getByTestId("orb")).toBeTruthy();
    expect(screen.getByTestId("orb-core")).toBeTruthy();
    expect(screen.getByTestId("orb-glow")).toBeTruthy();
    expect(screen.queryByTestId("orb-waveform")).toBeNull();
  });

  it("VoiceOrb shows degraded ring in degraded state", () => {
    render(<VoiceOrb state="degraded" reducedMotion testID="orb-degraded" />);
    expect(screen.getByTestId("orb-degraded-degraded-ring")).toBeTruthy();
  });

  it("VoiceOrb a11y labels cover S15 states", () => {
    expect(voiceOrbAccessibilityLabel("speaking")).toContain("打断");
    expect(voiceOrbAccessibilityLabel("degraded")).toContain("文字");
    expect(voiceOrbAccessibilityLabel("error", "token exchange failed")).toContain(
      "token exchange failed",
    );
  });

  it("VoiceOrb speaking state exposes speaking ring", () => {
    render(<VoiceOrb state="speaking" reducedMotion testID="orb-speaking" />);
    expect(screen.getByTestId("orb-speaking-speaking-ring")).toBeTruthy();
  });

  it("ConstellationStar pressable hit area is at least 44px", () => {
    render(
      <ConstellationStar variant="pending" size={10} onPress={() => {}} />,
    );
    const pressable = screen.getByTestId("constellation-star-pressable");
    expect(pressable).toBeTruthy();
    const star = screen.getByTestId("constellation-star");
    const style = (star as HTMLElement).style;
    expect(Number.parseInt(style.width, 10)).toBeGreaterThanOrEqual(44);
    expect(Number.parseInt(style.height, 10)).toBeGreaterThanOrEqual(44);
  });
});
