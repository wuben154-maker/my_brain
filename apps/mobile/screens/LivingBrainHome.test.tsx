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
      accessibilityRole,
      accessibilityLabel,
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      accessibilityRole?: string;
      accessibilityLabel?: string;
    }) {
      return React.createElement(
        onPress ? "button" : tag,
        {
          "data-testid": testID,
          onClick: onPress,
          role: accessibilityRole,
          "aria-label": accessibilityLabel,
        },
        children,
      );
    };
  return {
    View: RN("div"),
    Text: RN("span"),
    Pressable: RN("button"),
    TextInput: RN("input"),
    ScrollView: RN("div"),
    SafeAreaView: RN("div"),
    StatusBar: () => null,
    Modal: ({
      children,
      visible,
    }: {
      children?: React.ReactNode;
      visible?: boolean;
    }) => (visible ? React.createElement("div", null, children) : null),
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
      OS: "android",
      Version: "14",
      select: (o: Record<string, string>) => o.android ?? o.default ?? Object.values(o)[0],
    },
    NativeModules: {
      Voice: {
        isAvailable: async () => true,
        start: async () => {},
        stop: async () => {},
        cancel: async () => {},
        destroy: async () => {},
        removeAllListeners: () => {},
        isRecognizing: async () => false,
      },
    },
    AppState: {
      currentState: "active",
      addEventListener: () => ({ remove: () => {} }),
    },
    Share: { share: vi.fn() },
  };
});

vi.mock("expo-constants", () => ({
  default: {
    nativeBuildVersion: null,
  },
}));

import { LivingBrainHome } from "./LivingBrainHome";
import { NavigationProvider, useNavigation } from "../navigation/NavigationContext";
import { ThemeProvider } from "../theme/ThemeProvider";
import { resetVoiceSessionSingleton } from "../voice/VoiceSession";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";
import { InMemoryGraphRepository, InMemoryHistoryRepository, applyIngestCreate, buildLivingHomeEntry } from "@my-brain/core";

function HomeWithNavStack() {
  const { stack } = useNavigation();
  return (
    <>
      <span data-testid="nav-stack">{stack.join(",")}</span>
      <LivingBrainHome />
    </>
  );
}

describe("LivingBrainHome", () => {
  beforeEach(() => {
    resetVoiceSessionSingleton();
    useProvisionalStore.setState({ candidates: [], lastExplanation: null, lastSsrfHint: null });
    useMobileAppStore.setState({
      phase: "empty_invite",
      coldStartComplete: false,
      settingsOpen: false,
      queueSheetOpen: false,
      storageReady: true,
      graph: new InMemoryGraphRepository(),
      history: new InMemoryHistoryRepository(),
      visibleNodes: [],
      m5Experiences: null,
      replayCursor: null,
      providerStatus: {
        llm: "mock",
        radar: "fixture",
        voice: "disconnected",
        storage: "ready",
      },
      persistWarnings: [],
      degraded: {
        active: ["mock_llm", "fixture_radar", "voice_disconnected", "profile_seed_degraded"],
        providerMode: "mock",
      },
    });
  });

  afterEach(() => {
    resetVoiceSessionSingleton();
    cleanup();
  });

  it("renders empty invite with degraded banner", () => {
    render(
      <ThemeProvider mode="dark">
        <NavigationProvider>
          <LivingBrainHome />
        </NavigationProvider>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("living-brain-home")).toBeTruthy();
    expect(screen.queryByTestId("settings-screen")).toBeNull();
    expect(screen.getByTestId("degraded-mode-banner")).toBeTruthy();
    expect(screen.getByTestId("constellation-field")).toBeTruthy();
    expect(screen.getByTestId("constellation-field-pending-star")).toBeTruthy();
  });

  it("empty_invite cold start UI matches S04 contract", () => {
    render(
      <ThemeProvider mode="dark">
        <NavigationProvider>
          <LivingBrainHome />
        </NavigationProvider>
      </ThemeProvider>,
    );
    expect(screen.getByText("这里还空着")).toBeTruthy();
    expect(screen.getByText("开始聊")).toBeTruthy();
    expect(screen.getByText("语音暂不可用，可以先用文字聊聊")).toBeTruthy();
    expect(screen.getByText("先随手记一下")).toBeTruthy();
    expect(screen.queryByText(/今天值得继续的一件事/)).toBeNull();
    expect(screen.queryByTestId("intent-rail")).toBeNull();
    expect(screen.queryByTestId("adaptive-radar")).toBeNull();
    expect(screen.queryByTestId("memory-weather")).toBeNull();
    expect(screen.getByTestId("home-voice-orb")).toBeTruthy();
  });

  it("settings entry exposes trust settings a11y label", () => {
    render(
      <ThemeProvider mode="dark">
        <NavigationProvider>
          <LivingBrainHome />
        </NavigationProvider>
      </ThemeProvider>,
    );
    const entry = screen.getByTestId("settings-entry");
    expect(entry.getAttribute("aria-label")).toBe("信任与设置");
    expect(entry.getAttribute("role")).toBe("button");
  });

  it("empty invite voice orb reflects disconnected degraded state", () => {
    render(
      <ThemeProvider mode="dark">
        <NavigationProvider>
          <LivingBrainHome />
        </NavigationProvider>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("home-voice-orb-degraded-ring")).toBeTruthy();
  });

  it("does not render inline Settings tree when settingsOpen is true", () => {
    useMobileAppStore.setState({ settingsOpen: true });
    render(
      <ThemeProvider mode="dark">
        <NavigationProvider>
          <LivingBrainHome />
        </NavigationProvider>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("living-brain-home")).toBeTruthy();
    expect(screen.queryByTestId("settings-screen")).toBeNull();
    expect(screen.queryByTestId("m3-voice-diagnostics-panel")).toBeNull();
  });

  it("adaptive_live shows personalized daily entry from real signals", () => {
    const profile = {
      primaryMode: "tech_tracker" as const,
      secondaryModes: [] as const,
      confidence: 0.8,
      recentIntent: "跟进 AI 开源动态",
    };
    useMobileAppStore.getState().completeColdStart(profile);
    useMobileAppStore.setState({
      phase: "adaptive_live",
      degraded: { active: [], providerMode: "live" },
      providerStatus: {
        llm: "live",
        radar: "live",
        voice: "live",
        storage: "ready",
      },
    });
    const { signals, degraded } = useMobileAppStore.getState();
    const expected = buildLivingHomeEntry(profile, signals, degraded);

    render(
      <ThemeProvider mode="dark">
        <NavigationProvider>
          <LivingBrainHome />
        </NavigationProvider>
      </ThemeProvider>,
    );

    expect(screen.getByTestId("home-daily-entry-headline").textContent).toBe(expected.headline);
    expect(screen.getByTestId("home-daily-entry")).toBeTruthy();
    expect(screen.getByTestId("home-daily-entry-line-0").textContent).toContain("雷达入口");
    expect(screen.queryByTestId("adaptive-radar-list")).toBeNull();
    expect(screen.queryByTestId("intent-rail")).toBeNull();
  });

  it("adaptive_live labels degraded daily entry lines honestly", () => {
    useMobileAppStore.getState().completeColdStart({
      primaryMode: "tech_tracker",
      secondaryModes: [],
      confidence: 0.8,
    });
    useMobileAppStore.setState({
      phase: "adaptive_live",
      degraded: {
        active: ["mock_llm", "fixture_radar", "voice_disconnected", "profile_seed_degraded"],
        providerMode: "mock",
      },
    });
    render(
      <ThemeProvider mode="dark">
        <NavigationProvider>
          <LivingBrainHome />
        </NavigationProvider>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("degraded-mode-banner")).toBeTruthy();
    expect(screen.getByTestId("home-daily-entry-line-0-degraded")).toBeTruthy();
    expect(screen.getByTestId("home-daily-entry-line-0-degraded").textContent).toContain("演示");
  });

  it("adaptive_live does not expose fixture chips as product state", () => {
    useMobileAppStore.getState().completeColdStart({
      primaryMode: "tech_tracker",
      secondaryModes: [],
      confidence: 0.8,
    });
    useMobileAppStore.setState({ phase: "adaptive_live" });
    render(
      <ThemeProvider mode="dark">
        <NavigationProvider>
          <LivingBrainHome />
        </NavigationProvider>
      </ThemeProvider>,
    );
    expect(screen.queryByTestId("cold-start-fixture-chip")).toBeNull();
    expect(screen.queryByTestId("demo-fixture-chip")).toBeNull();
    expect(screen.queryByTestId("adaptive-radar")).toBeNull();
  });

  it("adaptive_live shows TodayFocus single card with reason", () => {
    useMobileAppStore.getState().completeColdStart({
      primaryMode: "tech_tracker",
      secondaryModes: [],
      confidence: 0.8,
    });
    useMobileAppStore.setState({ phase: "adaptive_live" });
    render(
      <ThemeProvider mode="dark">
        <NavigationProvider>
          <LivingBrainHome />
        </NavigationProvider>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("today-focus-card")).toBeTruthy();
    expect(screen.getByTestId("today-focus-reason")).toBeTruthy();
    expect(screen.queryByTestId("adaptive-radar-list")).toBeNull();
    expect(screen.queryByTestId("adaptive-radar")).toBeNull();
  });

  it("adaptive_live shows light entries for capture, brain map, and memory review", () => {
    useMobileAppStore.getState().completeColdStart({
      primaryMode: "tech_tracker",
      secondaryModes: [],
      confidence: 0.8,
    });
    useMobileAppStore.setState({ phase: "adaptive_live" });
    render(
      <ThemeProvider mode="dark">
        <NavigationProvider>
          <LivingBrainHome />
        </NavigationProvider>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("home-capture-inbox-entry")).toBeTruthy();
    expect(screen.getByTestId("home-brain-map-entry")).toBeTruthy();
    expect(screen.getByTestId("home-memory-review-entry")).toBeTruthy();
  });

  it("adaptive_live TodayFocusCard navigates to Today route", () => {
    useMobileAppStore.getState().completeColdStart({
      primaryMode: "tech_tracker",
      secondaryModes: [],
      confidence: 0.8,
    });
    useMobileAppStore.setState({ phase: "adaptive_live" });
    render(
      <ThemeProvider mode="dark">
        <NavigationProvider>
          <HomeWithNavStack />
        </NavigationProvider>
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByTestId("today-focus-card-body"));
    expect(screen.getByTestId("nav-stack").textContent).toBe("LivingBrainHome,Today");
  });

  it("adaptive_live brain map entry navigates to BrainMap route", () => {
    useMobileAppStore.getState().completeColdStart({
      primaryMode: "tech_tracker",
      secondaryModes: [],
      confidence: 0.8,
    });
    useMobileAppStore.setState({ phase: "adaptive_live" });
    render(
      <ThemeProvider mode="dark">
        <NavigationProvider>
          <HomeWithNavStack />
        </NavigationProvider>
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByTestId("home-brain-map-entry"));
    expect(screen.getByTestId("nav-stack").textContent).toBe("LivingBrainHome,BrainMap");
  });

  it("adaptive_live hides context decision bar without candidate", () => {
    useMobileAppStore.getState().completeColdStart({
      primaryMode: "tech_tracker",
      secondaryModes: [],
      confidence: 0.8,
    });
    useMobileAppStore.setState({ phase: "adaptive_live" });
    render(
      <ThemeProvider mode="dark">
        <NavigationProvider>
          <LivingBrainHome />
        </NavigationProvider>
      </ThemeProvider>,
    );
    expect(screen.queryByTestId("context-decision-bar")).toBeNull();
    expect(screen.queryByTestId("intent-rail")).toBeNull();
  });

  it("adaptive_live does not show empty_invite copy", () => {
    useMobileAppStore.getState().completeColdStart({
      primaryMode: "tech_tracker",
      secondaryModes: [],
      confidence: 0.8,
    });
    useMobileAppStore.setState({ phase: "adaptive_live" });
    render(
      <ThemeProvider mode="dark">
        <NavigationProvider>
          <LivingBrainHome />
        </NavigationProvider>
      </ThemeProvider>,
    );
    expect(screen.queryByText("这里还空着")).toBeNull();
    expect(screen.queryByTestId("home-empty-invite")).toBeNull();
  });

  it("empty_invite shows pending banner when native share adds candidates", () => {
    useProvisionalStore.getState().addTextCapture("分享的链接摘要");
    render(
      <ThemeProvider mode="dark">
        <NavigationProvider>
          <LivingBrainHome />
        </NavigationProvider>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("provisional-pending-banner")).toBeTruthy();
    expect(screen.getByTestId("provisional-pending-count").textContent).toContain("1");
    expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(0);
  });

  it("empty_invite auto-opens provisional queue sheet after native drain", async () => {
    const { enqueueNativeShareHandoff, clearNativeShareHandoffMemoryQueue } = await import(
      "../capture/nativeShareHandoff"
    );
    enqueueNativeShareHandoff("android_intent", {
      action: "android.intent.action.SEND",
      mimeType: "text/plain",
      text: "Android 分享测试",
    });
    await useProvisionalStore.getState().drainNativeShareHandoffQueue();
    expect(useMobileAppStore.getState().queueSheetOpen).toBe(true);
    render(
      <ThemeProvider mode="dark">
        <NavigationProvider>
          <LivingBrainHome />
        </NavigationProvider>
      </ThemeProvider>,
    );
    const pending = useProvisionalStore.getState().listPending();
    expect(pending).toHaveLength(1);
    expect(screen.getByTestId("provisional-queue-sheet")).toBeTruthy();
    expect(screen.getByTestId(`provisional-item-${pending[0]!.id}`)).toBeTruthy();
    expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(0);
    clearNativeShareHandoffMemoryQueue();
  });

  it("adaptive_live constellation reflects visibleNodes after ingest", () => {
    useMobileAppStore.getState().completeColdStart({
      primaryMode: "tech_tracker",
      secondaryModes: [],
      confidence: 0.8,
    });
    const graph = useMobileAppStore.getState().graph;
    const history = useMobileAppStore.getState().history;
    const result = applyIngestCreate(
      {
        concept: "入库后的星核",
        intro: "用户确认后写入",
        sourceLinks: [],
      },
      { graph, history },
    );
    useMobileAppStore.getState().syncGraphView();

    render(
      <ThemeProvider mode="dark">
        <NavigationProvider>
          <LivingBrainHome />
        </NavigationProvider>
      </ThemeProvider>,
    );
    expect(screen.getByTestId(`constellation-field-node-${result.nodeId}`)).toBeTruthy();
    expect(
      useMobileAppStore.getState().visibleNodes.some((item) => item.id === result.nodeId),
    ).toBe(true);
  });

  it("provisional queue sheet avoids engineering gate copy on main path", () => {
    useMobileAppStore.setState({ queueSheetOpen: true });
    useProvisionalStore.getState().addTextCapture("分享摘要");
    render(
      <ThemeProvider mode="dark">
        <NavigationProvider>
          <LivingBrainHome />
        </NavigationProvider>
      </ThemeProvider>,
    );
    const sheet = screen.getByTestId("provisional-queue-sheet");
    expect(sheet.textContent).toContain("语音暂不可用");
    expect(sheet.textContent).not.toMatch(/M3|未 PASS|voice_disconnected|S\d+/);
  });
});
