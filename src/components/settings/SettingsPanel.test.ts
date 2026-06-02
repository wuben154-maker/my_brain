/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { setAgentSchedulerRuntime } from "@/agent/schedulerRuntime";
import { DEFAULT_SCHEDULER_SETTINGS } from "@/agent/schedulerSettings";
import { useAppStore } from "@/stores/appStore";
import { useProfileStore } from "@/stores/profileStore";

describe("SettingsPanel (N4)", () => {
  afterEach(() => {
    cleanup();
    setAgentSchedulerRuntime(null);
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    useProfileStore.setState({
      profile: useProfileStore.getState().profile,
      isLoaded: true,
    });
    useAppStore.setState({
      phase: "ready",
      storage: null,
    } as Partial<ReturnType<typeof useAppStore.getState>>);
  });

  it("does not render API key fields", () => {
    render(createElement(SettingsPanel));
    expect(screen.queryByLabelText(/api key/i)).toBeNull();
    expect(screen.queryByPlaceholderText(/sk-/i)).toBeNull();
    expect(screen.getByTestId("settings-voice-mode").textContent).toBe("mock");
  });

  it("toggles scheduler via runtime API", async () => {
    const updateSettings = vi.fn(async (partial: { enabled?: boolean }) => ({
      ...DEFAULT_SCHEDULER_SETTINGS,
      ...partial,
    }));
    setAgentSchedulerRuntime({
      scheduler: {
        start: vi.fn(),
        stop: vi.fn(),
        triggerNow: vi.fn(async () => ({
          runId: "r",
          startedAt: "",
          finishedAt: "",
          proposals: [],
          digest: null,
          trace: [],
        })),
        onRun: () => () => undefined,
        isRunning: () => false,
      },
      getSettings: () => DEFAULT_SCHEDULER_SETTINGS,
      updateSettings,
    });

    render(createElement(SettingsPanel));
    const checkbox = screen.getByTestId(
      "settings-scheduler-enabled",
    ) as HTMLInputElement;
    checkbox.click();
    await vi.waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({ enabled: true });
    });
  });
});
