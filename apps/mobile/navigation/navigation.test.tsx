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
      accessibilityRole,
      accessibilityLabel,
      onPress,
      value,
      onChangeText,
      placeholder,
    }: {
      children?: React.ReactNode;
      testID?: string;
      accessibilityRole?: string;
      accessibilityLabel?: string;
      onPress?: () => void;
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
    Linking: { openURL: vi.fn() },
    useColorScheme: () => "dark",
  };
});

vi.mock("../config/legalLinks", () => ({
  readPrivacyPolicyLink: () => ({
    url: "https://mybrain.local/dev/privacy-policy-draft",
    scope: "dev-draft",
    localPath: "docs/legal/privacy-policy-draft.md",
    label: "隐私政策（local/dev 草案，非生产 legal PASS）",
  }),
}));

vi.mock("expo-constants", () => ({
  default: {
    nativeBuildVersion: null,
  },
}));

import { RootNavigator } from "./RootNavigator";
import { NavigationProvider, useNavigation } from "./NavigationContext";
import { Routes } from "./routes";
import { TodayScreen } from "../screens/TodayScreen";
import { CaptureInboxScreen } from "../screens/CaptureInboxScreen";
import { BrainMapScreen } from "../screens/BrainMapScreen";
import { MemoryReviewScreen } from "../screens/MemoryReviewScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { ThemeProvider } from "../theme/ThemeProvider";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { resetVoiceSessionSingleton } from "../voice/VoiceSession";
import { generateAdaptiveSignals, inferUserModeProfileFromDialogue } from "@my-brain/core";

function NavProbe() {
  const { navigate, stack } = useNavigation();
  return (
    <div>
      <span data-testid="nav-stack">{stack.join(",")}</span>
      <button type="button" data-testid="nav-today" onClick={() => navigate(Routes.Today)}>
        Today
      </button>
      <button
        type="button"
        data-testid="nav-capture"
        onClick={() => navigate(Routes.CaptureInbox)}
      >
        Capture
      </button>
      <button type="button" data-testid="nav-brain-map" onClick={() => navigate(Routes.BrainMap)}>
        BrainMap
      </button>
      <button
        type="button"
        data-testid="nav-memory"
        onClick={() => navigate(Routes.MemoryReview)}
      >
        Memory
      </button>
      <button type="button" data-testid="nav-settings" onClick={() => navigate(Routes.Settings)}>
        Settings
      </button>
    </div>
  );
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      <NavigationProvider>{ui}</NavigationProvider>
    </ThemeProvider>,
  );
}

describe("navigation", () => {
  afterEach(() => cleanup());

  it("RootNavigator has no bottom tab bar testID", () => {
    render(
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>,
    );
    expect(screen.queryByTestId("tab-bar")).toBeNull();
    expect(screen.getByTestId("root-navigator")).toBeTruthy();
    expect(screen.getByTestId("living-brain-home")).toBeTruthy();
  });

  it("does not reference createBottomTabNavigator in navigation module", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const navDir = path.resolve(__dirname);
    const files = fs
      .readdirSync(navDir)
      .filter((f) => (f.endsWith(".ts") || f.endsWith(".tsx")) && !f.includes(".test."));
    for (const file of files) {
      const source = fs.readFileSync(path.join(navDir, file), "utf8");
      expect(/createBottomTabNavigator\s*\(/.test(source)).toBe(false);
    }
  });

  it("routes.ts exports space routes including Settings and ProviderSettings", () => {
    expect(Object.keys(Routes)).toHaveLength(7);
    expect(Routes.LivingBrainHome).toBe("LivingBrainHome");
    expect(Routes.Settings).toBe("Settings");
    expect(Routes.ProviderSettings).toBe("ProviderSettings");
  });

  describe("secondary screens", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("Today screen has back, subtitle, and entry cards without M diagnostics", () => {
      const profile = inferUserModeProfileFromDialogue(["我想跟进 AI 和开源"], "cold-tech-tracker");
      useMobileAppStore.setState({
        userProfile: profile,
        signals: generateAdaptiveSignals(profile),
      });
      renderWithProviders(<TodayScreen />);
      expect(screen.getByTestId("today-screen")).toBeTruthy();
      expect(screen.getByTestId("page-header-subtitle").textContent).toBe(
        "不是信息流，是今天和你最有关的入口。",
      );
      expect(screen.getAllByTestId("today-entry-reason").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByLabelText("返回")).toBeTruthy();
      expect(screen.queryByTestId("m3-voice-diagnostics-panel")).toBeNull();
      expect(screen.queryByTestId("rss-feed")).toBeNull();
    });

    it("CaptureInbox has back, header, and inbox list", () => {
      renderWithProviders(<CaptureInboxScreen />);
      expect(screen.getByTestId("capture-inbox-screen")).toBeTruthy();
      expect(screen.getByTestId("capture-inbox-header-title").textContent).toBe(
        "待点亮星尘",
      );
      expect(screen.getByTestId("capture-inbox-header-subtitle").textContent).toBe(
        "候选先在这里，确认前不会进入永久星图。",
      );
      expect(screen.getByLabelText("返回")).toBeTruthy();
      expect(screen.getByTestId("capture-inbox-list")).toBeTruthy();
    });

    it("BrainMap has back, header, and constellation viewport", () => {
      renderWithProviders(<BrainMapScreen />);
      expect(screen.getByTestId("brain-map-screen")).toBeTruthy();
      expect(screen.getByTestId("brain-map-header-title").textContent).toBe("知识星图");
      expect(screen.getByLabelText("返回")).toBeTruthy();
    });

    it("MemoryReview has back, header, and M5 experience actions", () => {
      renderWithProviders(<MemoryReviewScreen />);
      expect(screen.getByTestId("memory-review-screen")).toBeTruthy();
      expect(screen.getByTestId("memory-review-header")).toBeTruthy();
      expect(screen.getByTestId("memory-review-start-replay")).toBeTruthy();
      expect(screen.getByTestId("memory-review-generate-weekly")).toBeTruthy();
      expect(screen.getByLabelText("返回")).toBeTruthy();
    });

    it("Settings has PageHeader back with M3 diagnostics entry", () => {
      renderWithProviders(<SettingsScreen forceDevAccess />);
      expect(screen.getByTestId("settings-screen")).toBeTruthy();
      expect(screen.getByTestId("settings-back")).toBeTruthy();
      expect(screen.getByLabelText("返回")).toBeTruthy();
      expect(screen.queryByTestId("tab-bar")).toBeNull();
      expect(screen.getByTestId("settings-scroll")).toBeTruthy();
      fireEvent.click(screen.getByTestId("developer-diagnostics-toggle"));
      expect(screen.getByTestId("m3-voice-diagnostics-panel")).toBeTruthy();
      expect(screen.getByTestId("m3-voice-mock-banner").textContent).toContain("mock");
    });

    it("stack navigation pushes routes via NavigationProvider", () => {
      renderWithProviders(
        <>
          <NavProbe />
          <TodayScreen />
        </>,
      );
      expect(screen.getByTestId("nav-stack").textContent).toBe("LivingBrainHome");
    });
  });

  describe("LivingBrainHome product entries", () => {
    beforeEach(() => {
      resetVoiceSessionSingleton();
      useMobileAppStore.getState().completeColdStart({
        primaryMode: "tech_tracker",
        secondaryModes: [],
        confidence: 0.8,
      });
      useMobileAppStore.setState({ phase: "adaptive_live" });
    });

    afterEach(() => {
      resetVoiceSessionSingleton();
    });

    it("TodayFocusCard opens Today screen from RootNavigator", () => {
      render(
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>,
      );
      expect(screen.getByTestId("living-brain-home")).toBeTruthy();
      fireEvent.click(screen.getByTestId("today-focus-card-body"));
      expect(screen.getByTestId("today-screen")).toBeTruthy();
      expect(screen.queryByTestId("living-brain-home")).toBeNull();
    });

    it("HomeLightEntries brain map row opens BrainMap screen from RootNavigator", () => {
      render(
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>,
      );
      expect(screen.getByTestId("home-brain-map-entry")).toBeTruthy();
      fireEvent.click(screen.getByTestId("home-brain-map-entry"));
      expect(screen.getByTestId("brain-map-screen")).toBeTruthy();
      expect(screen.queryByTestId("living-brain-home")).toBeNull();
    });
  });
});
