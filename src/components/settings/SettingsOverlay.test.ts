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

  it("renders thin-line SVG gear icon instead of text glyph", () => {
    render(createElement(SettingsOverlay, { companionCorner: true }));
    expect(screen.getByTestId("settings-gear-icon")).toBeTruthy();
    expect(screen.getByTestId("settings-corner").textContent).not.toContain("⚙");
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

  it("opens profile panel from settings overlay and saves correction", async () => {
    const saveUserProfile = vi.fn(async () => undefined);
    useAppStore.setState({
      providers: createAppProviders({ openAiApiKey: "" }),
      storage: { saveUserProfile } as never,
    });
    useProfileStore.getState().reset();

    render(createElement(SettingsOverlay, { companionCorner: true }));
    fireEvent.click(screen.getByTestId("settings-corner"));
    fireEvent.click(screen.getByTestId("settings-open-profile"));

    expect(screen.getByTestId("profile-panel")).toBeTruthy();

    fireEvent.change(screen.getByTestId("profile-understanding-demo-rag"), {
      target: { value: "can_explain" },
    });
    fireEvent.click(screen.getByTestId("profile-save-correction"));

    await vi.waitFor(() => {
      expect(useProfileStore.getState().profile.understanding?.["demo-rag"]).toBe(
        "can_explain",
      );
      expect(useProfileStore.getState().lastCorrection).not.toBeNull();
    });
    expect(saveUserProfile).toHaveBeenCalled();

    const undoButton = screen.getByTestId(
      "profile-undo-correction",
    ) as HTMLButtonElement;
    await vi.waitFor(() => {
      expect(undoButton.disabled).toBe(false);
    });
    fireEvent.click(undoButton);
    await vi.waitFor(() => {
      expect(useProfileStore.getState().profile.understanding?.["demo-rag"]).toBe(
        "heard",
      );
    });
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
