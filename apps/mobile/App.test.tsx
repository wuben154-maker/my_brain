/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";

const bootstrapScenario = vi.hoisted(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  if (!(globalThis as { expo?: { EventEmitter: new () => unknown } }).expo) {
    (globalThis as { expo: { EventEmitter: new () => unknown } }).expo = {
      EventEmitter: class EventEmitter {
        addListener() {
          return { remove() {} };
        }
        removeListener() {}
        removeAllListeners() {}
        emit() {}
      },
    };
  }
  return { mode: "ready" as "ready" | "migrating" };
});

vi.mock("./capture/nativeShareHandoffLifecycle", () => ({
  wireNativeShareHandoffLifecycle: vi.fn(),
}));

vi.mock("./boot/storageBootstrap", async () => {
  const React = await import("react");
  const { createEmptyCorrectionState } = await import("@my-brain/core");

  const emptyBundle = {
    coldStartComplete: false,
    profile: null,
    correctionState: createEmptyCorrectionState(),
    graph: { nodes: [], edges: [] },
    history: [],
    provisional: [],
    signals: [],
    learningTraces: [],
    pendingIngest: null,
    providerConfig: {
      llm: "mock" as const,
      radar: "fixture" as const,
      voice: "disconnected" as const,
      storage: "ready" as const,
    },
  };

  return {
    isVitestRuntime: () => true,
    useStorageBootstrap: (onHydrated: (bundle: typeof emptyBundle) => void) => {
      React.useEffect(() => {
        if (bootstrapScenario.mode === "ready") {
          onHydrated(emptyBundle);
        }
      }, [onHydrated]);

      return {
        status: bootstrapScenario.mode === "ready" ? ("ready" as const) : ("migrating" as const),
        error: null,
        schemaVersion: 1,
        retry: vi.fn(),
      };
    },
  };
});

vi.mock("react-native", () => {
  const RN = (tag: string) =>
    function MockComponent({
      children,
      testID,
      onPress,
      accessibilityRole,
      accessibilityLabel,
      value,
      onChangeText,
      placeholder,
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      accessibilityRole?: string;
      accessibilityLabel?: string;
      value?: string;
      onChangeText?: (text: string) => void;
      placeholder?: string;
    }) {
      if (tag === "input") {
        return React.createElement("textarea", {
          "data-testid": testID,
          value,
          placeholder,
          onChange: (e: { target: { value: string } }) => onChangeText?.(e.target.value),
        });
      }
      return React.createElement(
        onPress ? "button" : tag,
        {
          "data-testid": testID,
          role: accessibilityRole,
          "aria-label": accessibilityLabel,
          onClick: onPress,
        },
        children,
      );
    };

  class MockAnimatedValue {
    constructor(public value: number) {}
    setValue() {}
    stopAnimation() {}
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
    sequence: (animations: unknown[]) => animations[0],
    loop: (animation: unknown) => ({
      start: () => animation,
      stop: () => {},
    }),
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
    Animated,
    StyleSheet: { create: (s: object) => s, hairlineWidth: 1 },
    useWindowDimensions: () => ({
      width: 390,
      height: 844,
      scale: 1,
      fontScale: 1,
    }),
    Easing: { inOut: () => ({}), ease: {} },
    PanResponder: {
      create: () => ({ panHandlers: {} }),
    },
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
    Switch: ({
      testID,
      value,
      onValueChange,
    }: {
      testID?: string;
      value?: boolean;
      onValueChange?: (v: boolean) => void;
    }) =>
      React.createElement("input", {
        type: "checkbox",
        "data-testid": testID,
        checked: value,
        onChange: () => onValueChange?.(!value),
      }),
    Linking: {
      openURL: vi.fn(),
      getInitialURL: vi.fn().mockResolvedValue(null),
      addEventListener: vi.fn(() => ({ remove: vi.fn() })),
    },
    useColorScheme: () => "dark",
  };
});

vi.mock("./services/providerConfigStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./services/providerConfigStore")>();
  return {
    ...actual,
    loadProviderVerification: () => ({
      verified: true,
      llmLive: true,
      voiceLive: true,
      verifiedAt: "2026-01-01T00:00:00.000Z",
    }),
  };
});

vi.mock("expo-constants", () => ({
  default: {
    nativeBuildVersion: null,
  },
}));

vi.mock("expo-font", () => ({
  useFonts: () => [true],
  isLoaded: () => true,
  loadAsync: vi.fn(async () => undefined),
}));

vi.mock("@expo-google-fonts/dm-sans", () => ({
  useFonts: () => [true],
  DMSans_400Regular: "DMSans_400Regular",
  DMSans_500Medium: "DMSans_500Medium",
  DMSans_600SemiBold: "DMSans_600SemiBold",
}));

vi.mock("@expo-google-fonts/noto-sans-sc", () => ({
  NotoSansSC_400Regular: "NotoSansSC_400Regular",
  NotoSansSC_500Medium: "NotoSansSC_500Medium",
}));

import App from "./App";
import { LAUNCH_MAX_MS } from "./screens/LaunchScreen";
import { resetVoiceSessionSingleton } from "./voice/VoiceSession";
import { setVisualFixtureCaptureRoute } from "./visual-fixtures/captureSession";
import { useMobileAppStore } from "./stores/mobileAppStore";
import { useProvisionalStore } from "./stores/provisionalStore";
import { setStorageSession } from "./storage/storageSession";
import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
  createEmptyCorrectionState,
  createInitialConversationState,
  createDefaultDegradedState,
} from "@my-brain/core";

function resetMobileStores() {
  useMobileAppStore.setState({
    phase: "launch",
    coldStartComplete: false,
    userProfile: null,
    signals: [],
    correctionState: createEmptyCorrectionState(),
    degraded: createDefaultDegradedState(false),
    conversation: createInitialConversationState(),
    graph: new InMemoryGraphRepository(),
    history: new InMemoryHistoryRepository(),
    visibleNodes: [],
    m5Experiences: null,
    learningTraces: [],
    replayCursor: null,
    lastIngestSummary: null,
    settingsOpen: false,
    profileReviewOpen: false,
    queueSheetOpen: false,
    hasApiKey: false,
    storageReady: false,
    pendingIngestProposal: null,
    providerStatus: {
      llm: "mock",
      radar: "fixture",
      voice: "disconnected",
      storage: "migrating",
    },
    persistWarnings: [],
    demoMode: false,
    appearancePreference: "dark",
  });
  useProvisionalStore.setState({ candidates: [], lastExplanation: null, lastSsrfHint: null });
}

describe("App shell integration", () => {
  beforeEach(() => {
    bootstrapScenario.mode = "ready";
    setVisualFixtureCaptureRoute(null);
    resetVoiceSessionSingleton();
    setStorageSession(null);
    resetMobileStores();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetVoiceSessionSingleton();
    setStorageSession(null);
    cleanup();
  });

  it("shows MigrationGate while storage bootstrap is migrating (CS-AUD-08)", async () => {
    bootstrapScenario.mode = "migrating";
    render(<App />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("migration-gate-screen")).toBeTruthy();
    expect(screen.queryByTestId("launch-screen")).toBeNull();
    expect(screen.queryByTestId("living-brain-home")).toBeNull();
  });

  it("empty storage → launch → empty_invite → cold start → adaptive_live (CS-AUD-01)", async () => {
    vi.useFakeTimers();
    render(<App />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("launch-screen")).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(LAUNCH_MAX_MS);
    });
    vi.useRealTimers();

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("home-empty-invite")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByTestId("start-cold-start"));
    });

    expect(screen.getByTestId("cold-start-dialogue")).toBeTruthy();

    const send = (text: string) => {
      const input = screen.getByTestId("cold-start-input") as HTMLTextAreaElement;
      fireEvent.change(input, { target: { value: text } });
      fireEvent.click(screen.getByTestId("cold-start-send"));
    };

    send("我想学 AI 语音");
    send("也在跟进开源项目");
    send("帮我记一下项目想法");
    fireEvent.click(screen.getByTestId("cold-start-confirm-profile"));
    fireEvent.click(screen.getByTestId("cold-start-light-star"));

    expect(screen.getByTestId("home-adaptive-shell")).toBeTruthy();

    const state = useMobileAppStore.getState();
    expect(state.coldStartComplete).toBe(true);
    expect(state.phase).toBe("adaptive_live");
    expect(state.userProfile).not.toBeNull();
    expect(state.firstStarCreated).toBe(true);
    expect(screen.queryByTestId("home-empty-invite")).toBeNull();
  });
});
