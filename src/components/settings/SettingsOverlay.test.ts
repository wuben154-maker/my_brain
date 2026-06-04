/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsOverlay } from "@/components/settings/SettingsOverlay";
import { createAppProviders } from "@/providers";
import { useAppStore } from "@/stores/appStore";
import { useProfileStore } from "@/stores/profileStore";

describe("SettingsOverlay (V5)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  beforeEach(() => {
    const providers = createAppProviders({ openAiApiKey: "" });
    useAppStore.setState({ providers, storage: null, phase: "companion" });
    useProfileStore.setState({
      profile: useProfileStore.getState().profile,
      isLoaded: true,
    });
  });

  it("renders voice timbre and persona controls when open", () => {
    render(createElement(SettingsOverlay));
    fireEvent.click(screen.getByTestId("settings-corner"));
    expect(screen.getByTestId("settings-overlay")).toBeTruthy();
    expect(screen.getByTestId("settings-overlay-voice")).toBeTruthy();
    expect(screen.getByTestId("settings-voice-nova")).toBeTruthy();
    expect(screen.getByTestId("settings-overlay-persona")).toBeTruthy();
    expect(screen.getByTestId("settings-persona-geek")).toBeTruthy();
    expect(screen.queryByLabelText(/api key/i)).toBeNull();
  });

  it("calls voice.setVoice when timbre changes", () => {
    const providers = createAppProviders({ openAiApiKey: "" });
    const setVoice = vi.spyOn(providers.voice, "setVoice");
    useAppStore.setState({ providers });
    render(createElement(SettingsOverlay));
    fireEvent.click(screen.getByTestId("settings-corner"));
    fireEvent.click(screen.getByTestId("settings-voice-nova"));
    expect(setVoice).toHaveBeenCalledWith("nova");
    expect(providers.voice.getVoice()).toBe("nova");
  });

  it("updates profile persona on preset click", () => {
    const saveUserProfile = vi.fn(async () => undefined);
    const storage = {
      loadUserProfile: vi.fn(async () => useProfileStore.getState().profile),
      saveUserProfile,
    };
    useAppStore.setState({
      providers: createAppProviders({ openAiApiKey: "" }),
      storage: storage as never,
    });
    render(createElement(SettingsOverlay));
    fireEvent.click(screen.getByTestId("settings-corner"));
    fireEvent.click(screen.getByTestId("settings-persona-geek"));
    expect(useProfileStore.getState().profile.persona).toBe("geek");
    expect(saveUserProfile).toHaveBeenCalled();
  });
});
