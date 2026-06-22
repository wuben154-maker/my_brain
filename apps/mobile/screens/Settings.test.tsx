/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";

vi.mock("expo-constants", () => ({
  default: {
    nativeBuildVersion: null,
  },
}));

vi.mock("../env/readAppEnv", () => ({
  readMobileAppEnv: vi.fn(() => ({
    runtime: "mobile",
    providerModes: { voice: "mock", llm: "mock", newsRadar: "mock" },
  })),
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => undefined),
  deleteItemAsync: vi.fn(async () => undefined),
}));

vi.mock("react-native", () => {
  const RN = (tag: string) =>
    function MockComponent({
      children,
      testID,
      accessibilityRole,
      accessibilityLabel,
      accessibilityState,
      onPress,
      disabled,
    }: {
      children?: React.ReactNode;
      testID?: string;
      accessibilityRole?: string;
      accessibilityLabel?: string;
      accessibilityState?: { expanded?: boolean };
      onPress?: () => void;
      disabled?: boolean;
    }) {
      return React.createElement(
        onPress ? "button" : tag,
        {
          "data-testid": testID,
          role: accessibilityRole,
          "aria-label": accessibilityLabel,
          "aria-expanded": accessibilityState?.expanded,
          onClick: disabled ? undefined : onPress,
        },
        children,
      );
    };
  return {
    View: RN("div"),
    Text: RN("span"),
    TextInput: RN("input"),
    Pressable: RN("button"),
    ScrollView: RN("div"),
    Modal: ({
      children,
      visible,
    }: {
      children?: React.ReactNode;
      visible?: boolean;
    }) => (visible ? React.createElement("div", null, children) : null),
    StyleSheet: { create: (s: object) => s },
    Platform: { OS: "android", Version: "14", select: (o: Record<string, string>) => o.android },
    Share: { share: vi.fn() },
    Alert: {
      alert: vi.fn(),
    },
    useColorScheme: () => "dark",
  };
});

import { Alert } from "react-native";

import { SettingsScreen, deriveTrustSummary } from "./SettingsScreen";
import {
  setVisualFixtureCaptureRoute,
} from "../visual-fixtures/captureSession";
import { NavigationProvider } from "../navigation/NavigationContext";
import { ThemeProvider, useTheme } from "../theme/ThemeProvider";
import { resetVoiceSessionSingleton } from "../voice/VoiceSession";
import { useMobileAppStore } from "../stores/mobileAppStore";

function renderSettings(forceDevAccess = true) {
  return render(
    <ThemeProvider mode="dark">
      <NavigationProvider>
        <SettingsScreen forceDevAccess={forceDevAccess} />
      </NavigationProvider>
    </ThemeProvider>,
  );
}

function ThemeModeProbe() {
  const { mode } = useTheme();
  return <span data-testid="theme-mode-probe">{mode}</span>;
}

describe("SettingsScreen (S09 Profile & Trust)", () => {
  beforeEach(() => {
    vi.mocked(Alert.alert).mockClear();
    resetVoiceSessionSingleton();
    setVisualFixtureCaptureRoute(null);
    useMobileAppStore.setState({
      profileReviewOpen: false,
      hasApiKey: false,
      userProfile: null,
      providerStatus: {
        llm: "mock",
        radar: "fixture",
        voice: "disconnected",
        storage: "ready",
      },
      degraded: {
        active: ["mock_llm", "fixture_radar", "voice_disconnected"],
        providerMode: "mock",
      },
    });
  });

  afterEach(() => {
    setVisualFixtureCaptureRoute(null);
    cleanup();
  });


  it("renders CK-08 visual fixture contract for adb capture", () => {
    setVisualFixtureCaptureRoute("SettingsScreen");
    renderSettings(false);
    expect(screen.getByTestId("page-header-title").textContent).toContain("Profile & Trust");
    expect(screen.getByTestId("trust-status-line").textContent).toBe(
      "当前状态：本地可用 · 演示语音",
    );
    expect(screen.getByTestId("trust-profile-title").textContent).toBe("学习者 + 技术追踪者");
    expect(screen.queryByTestId("settings-section-about")).toBeNull();
    expect(screen.queryByTestId("trust-mock-hint")).toBeNull();
    expect(screen.getByTestId("settings-section-provider-key")).toBeTruthy();
    setVisualFixtureCaptureRoute(null);
  });

  it("renders settings screen with PageHeader and scroll container", () => {
    renderSettings(false);
    expect(screen.getByTestId("settings-screen")).toBeTruthy();
    expect(screen.getByTestId("settings-scroll")).toBeTruthy();
    expect(screen.getByTestId("page-header-title").textContent).toContain("信任与设置");
    expect(screen.queryByText(/Profile & Trust/)).toBeNull();
  });

  it("hides provider integration rows on ordinary path", () => {
    renderSettings(false);
    expect(screen.queryByTestId("settings-provider-summary")).toBeNull();
    expect(screen.queryByTestId("provider-status-voice")).toBeNull();
    expect(screen.queryByText(/LLM/)).toBeNull();
    expect(screen.queryByText(/Token Exchange/)).toBeNull();
  });

  it("shows provider integration rows in developer fold when expanded", () => {
    renderSettings();
    expect(screen.queryByTestId("provider-status-voice")).toBeNull();
    fireEvent.click(screen.getByTestId("developer-diagnostics-toggle"));
    expect(screen.getByTestId("settings-provider-summary")).toBeTruthy();
    expect(screen.getByTestId("provider-status-voice").textContent).toContain("未连接");
    expect(screen.getByTestId("provider-status-voice").textContent).toContain("文字可用");
  });

  it("hides M3 diagnostics until developer fold expanded", () => {
    renderSettings();
    expect(screen.queryByTestId("m3-voice-diagnostics")).toBeNull();
    expect(screen.queryByTestId("m3-diagnostics")).toBeNull();
    expect(screen.queryByTestId("m3-voice-diagnostics-panel")).toBeNull();

    fireEvent.click(screen.getByTestId("developer-diagnostics-toggle"));
    expect(screen.getByTestId("m3-diagnostics")).toBeTruthy();
    expect(screen.getByTestId("m3-voice-diagnostics-panel")).toBeTruthy();
    expect(screen.getByTestId("m3-voice-mock-banner").textContent).toContain("mock");
    expect(screen.queryByTestId("m7a-backup-panel")).toBeNull();
    expect(screen.getByTestId("dev-backup-handoff-hint")).toBeTruthy();
  });

  it("does not show developer fold without dev access", () => {
    renderSettings(false);
    expect(screen.queryByTestId("developer-diagnostics-toggle")).toBeNull();
    expect(screen.queryByTestId("m3-voice-diagnostics-panel")).toBeNull();
  });

  it("shows backup export/import on ordinary path without dev unlock", () => {
    renderSettings(false);
    fireEvent.click(screen.getByTestId("settings-section-backup"));
    expect(screen.getByTestId("settings-backup-panel")).toBeTruthy();
    expect(screen.getByTestId("settings-backup-controls")).toBeTruthy();
    expect(screen.getByTestId("m7a-export-backup")).toBeTruthy();
    expect(screen.queryByText(/M7A/)).toBeNull();
    expect(screen.queryByText(/仍在完善中/)).toBeNull();
  });

  it("has back control", () => {
    renderSettings(false);
    expect(screen.getByTestId("settings-back")).toBeTruthy();
    expect(screen.getByLabelText("返回")).toBeTruthy();
  });

  it("shows productized trust summary without M stage numbers", () => {
    renderSettings(false);
    expect(screen.getByTestId("provider-summary-banner")).toBeTruthy();
    expect(screen.getByTestId("trust-status-line").textContent).toMatch(/当前状态/);
    expect(screen.getByTestId("trust-mock-hint")).toBeTruthy();
    expect(screen.queryByText(/M3/)).toBeNull();
    expect(screen.queryByText(/demo_fixture/)).toBeNull();
    expect(screen.queryByText(/mock\/degraded/)).toBeNull();
  });

  it("opens ProfileReview from 我的画像 section", () => {
    useMobileAppStore.getState().completeColdStart({
      primaryMode: "learner",
      secondaryModes: ["tech_tracker"],
      confidence: 0.82,
    });
    renderSettings(false);
    fireEvent.click(screen.getByTestId("settings-section-profile"));
    expect(screen.getByTestId("profile-review")).toBeTruthy();
    expect(screen.getByText(/画像与纠偏/)).toBeTruthy();
  });

  it("maps provider mock to 演示模式 copy", () => {
    const summary = deriveTrustSummary(
      { llm: "mock", radar: "fixture", voice: "disconnected", storage: "ready" },
      false,
      { active: ["mock_llm"], providerMode: "mock" },
      null,
    );
    expect(summary.statusLine).toContain("演示");
    expect(summary.productTier).toBe("demo");
  });

  it("hides cognitive action panel on ordinary local data path", () => {
    renderSettings(false);
    fireEvent.click(screen.getByTestId("settings-section-local-data"));
    expect(screen.queryByTestId("settings-cognitive-actions")).toBeNull();
  });

  it("shows cognitive action panel when developer access is enabled", () => {
    renderSettings(true);
    fireEvent.click(screen.getByTestId("settings-section-local-data"));
    expect(screen.getByTestId("settings-cognitive-actions")).toBeTruthy();
  });

  it("appearance light preference updates ThemeProvider mode", () => {
    useMobileAppStore.setState({ appearancePreference: "dark" });
    render(
      <ThemeProvider>
        <NavigationProvider>
          <ThemeModeProbe />
          <SettingsScreen forceDevAccess={false} />
        </NavigationProvider>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme-mode-probe").textContent).toBe("dark");
    fireEvent.click(screen.getByTestId("settings-section-appearance"));
    fireEvent.click(screen.getByTestId("settings-appearance-light"));
    expect(screen.getByTestId("theme-mode-probe").textContent).toBe("light");
    expect(useMobileAppStore.getState().appearancePreference).toBe("light");
  });

  it("does not mislead users that local data was cleared in demo build", () => {
    renderSettings(false);
    fireEvent.click(screen.getByTestId("settings-section-local-data"));
    expect(screen.getByTestId("settings-clear-data-subtitle").textContent).toContain(
      "不会删除本地数据",
    );

    fireEvent.click(screen.getByTestId("settings-clear-data"));
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenCalledWith(
      "演示构建暂不可用",
      expect.stringMatching(/不会删除.*图谱/),
      [{ text: "知道了", style: "default" }],
    );
    expect(Alert.alert).not.toHaveBeenCalledWith(
      "清除本地数据？",
      expect.any(String),
      expect.any(Array),
    );
  });
});
