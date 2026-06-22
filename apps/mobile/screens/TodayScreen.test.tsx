/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";

vi.mock("react-native", () => {
  const RN = (tag: string) =>
    function MockComponent({
      children,
      testID,
      onPress,
      accessibilityLabel,
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      accessibilityLabel?: string;
    }) {
      return React.createElement(
        onPress ? "button" : tag,
        {
          "data-testid": testID,
          "aria-label": accessibilityLabel,
          onClick: onPress,
        },
        children,
      );
    };
  return {
    View: RN("div"),
    Text: RN("span"),
    Pressable: RN("button"),
    ScrollView: RN("div"),
    Modal: ({
      children,
      visible,
    }: {
      children?: React.ReactNode;
      visible?: boolean;
    }) => (visible ? React.createElement("div", { "data-testid": "context-decision-sheet" }, children) : null),
    StyleSheet: { create: (s: object) => s, hairlineWidth: 1 },
    useWindowDimensions: () => ({
      width: 390,
      height: 844,
      scale: 1,
      fontScale: 1,
    }),
    Animated: {
      Value: class {
        setValue() {}
        stopAnimation() {}
        interpolate() {
          return 0;
        }
      },
      loop: (animation: unknown) => ({
        start: () => animation,
        stop: () => {},
      }),
      sequence: (animations: unknown[]) => animations[0],
      timing: () => ({}),
      View: RN("div"),
    },
    Easing: { inOut: () => ({}), ease: {} },
    Platform: {
      OS: "web",
      Version: "0",
      select: (o: Record<string, string>) => o.default ?? o.web ?? Object.values(o)[0],
    },
  };
});

import { TodayScreen } from "./TodayScreen";
import { NavigationProvider } from "../navigation/NavigationContext";
import { ThemeProvider } from "../theme/ThemeProvider";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";
import {
  generateAdaptiveSignals,
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
  inferUserModeProfileFromDialogue,
} from "@my-brain/core";

function renderToday() {
  return render(
    <ThemeProvider mode="dark">
      <NavigationProvider initialRoute="Today">
        <TodayScreen />
      </NavigationProvider>
    </ThemeProvider>,
  );
}

describe("TodayScreen", () => {
  beforeEach(() => {
    const profile = inferUserModeProfileFromDialogue(["我想跟进 AI 和开源"], "cold-tech-tracker");
    useProvisionalStore.setState({ candidates: [], lastExplanation: null });
    useMobileAppStore.setState({
      userProfile: profile,
      signals: generateAdaptiveSignals(profile),
      graph: new InMemoryGraphRepository(),
      history: new InMemoryHistoryRepository(),
      visibleNodes: [],
      pendingIngestProposal: null,
      storageReady: true,
      degraded: {
        active: ["mock_llm", "fixture_radar", "voice_disconnected"],
        providerMode: "mock",
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Today header, subtitle, voice hint, and signal-derived entry cards", () => {
    renderToday();
    expect(screen.getByTestId("today-screen")).toBeTruthy();
    expect(screen.getByTestId("page-header-title").textContent).toBe("今日");
    expect(screen.getByTestId("page-header-subtitle").textContent).toBe(
      "不是信息流，是今天和你最有关的入口。",
    );
    expect(screen.getByTestId("today-voice-hint").textContent).toBe("问我为什么推荐这条");
    expect(screen.getAllByTestId("today-entry-reason").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("today-entry-today-signal-0")).toBeTruthy();
  });

  it("does not render RSS feed or forbidden briefing copy", () => {
    renderToday();
    expect(screen.queryByTestId("rss-feed")).toBeNull();
    expect(document.body.textContent).not.toMatch(/\bRSS\b|Top3|简报/);
  });

  it("every card exposes non-empty reason text", () => {
    renderToday();
    for (const reason of screen.getAllByTestId("today-entry-reason")) {
      expect(reason.textContent?.trim().length).toBeGreaterThan(0);
    }
  });

  it("shows card action labels and context bar only after selection", () => {
    renderToday();
    expect(screen.getAllByLabelText("继续讲").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByLabelText("记住这条").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByLabelText("略过").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId("context-decision-bar")).toBeNull();

    fireEvent.click(screen.getByTestId("today-entry-today-signal-0-body"));
    expect(screen.getByTestId("context-decision-bar")).toBeTruthy();
    expect(screen.getByTestId("context-decision-bar-ingest").textContent).toBe("记住这条");
    expect(screen.getByTestId("context-decision-bar-skip").textContent).toBe("先不用");
    expect(screen.getByTestId("context-decision-bar-detail").textContent).toBe("多说点");
  });

  it("remember action records pending proposal without creating permanent graph nodes", () => {
    renderToday();
    const beforeCount = useMobileAppStore.getState().graph.getSnapshot().nodes.length;

    fireEvent.click(screen.getByTestId("today-entry-today-signal-0-action-ingest"));

    const afterCount = useMobileAppStore.getState().graph.getSnapshot().nodes.length;
    expect(afterCount).toBe(beforeCount);
    expect(useMobileAppStore.getState().pendingIngestProposal).not.toBeNull();
    expect(useMobileAppStore.getState().pendingIngestProposal?.concept.length).toBeGreaterThan(0);
  });

  it("shows graph-derived entry after ingest history exists", () => {
    const graph = useMobileAppStore.getState().graph;
    const history = useMobileAppStore.getState().history;
    const before = graph.getSnapshot();
    const node = graph.createNode({
      concept: "Provider 抽象",
      intro: "接口可替换",
      sourceLinks: [],
    });
    history.pushChange({
      kind: "node_created",
      summary: "点亮「Provider 抽象」",
      before,
      after: graph.getSnapshot(),
      createdAt: new Date().toISOString(),
    });

    renderToday();
    expect(screen.getByTestId(`today-entry-today-graph-${node.id}`)).toBeTruthy();
    expect(screen.getByText("Provider 抽象")).toBeTruthy();
  });

  it("shows empty state when storage is ready but no derivable rows", () => {
    useMobileAppStore.setState({
      signals: [],
      storageReady: true,
      userProfile: {
        ...inferUserModeProfileFromDialogue(["我想跟进 AI 和开源"], "cold-tech-tracker"),
        recentIntent: undefined,
      },
    });
    renderToday();
    expect(screen.getByTestId("today-empty-state")).toBeTruthy();
  });

  it("shows storage-not-ready empty state without crashing", () => {
    useMobileAppStore.setState({ storageReady: false, signals: [], userProfile: null });
    renderToday();
    expect(screen.getByTestId("today-storage-not-ready")).toBeTruthy();
  });
});
