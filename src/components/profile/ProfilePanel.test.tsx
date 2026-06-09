/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilePanel } from "@/components/profile/ProfilePanel";
import { useAppStore } from "@/stores/appStore";
import { useProfileStore } from "@/stores/profileStore";

describe("ProfilePanel (KOS-C2)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    useProfileStore.getState().reset();
    useAppStore.setState({
      storage: null,
      phase: "companion",
    } as Partial<ReturnType<typeof useAppStore.getState>>);
  });

  it("renders profile panel with default fields", () => {
    render(createElement(ProfilePanel));
    expect(screen.getByTestId("profile-panel")).toBeTruthy();
    expect(screen.getByTestId("profile-interest-list")).toBeTruthy();
    expect(screen.getByTestId("profile-understanding-demo-rag")).toBeTruthy();
    expect(screen.getByTestId("profile-explain-prefs")).toBeTruthy();
  });

  it("saves and undoes a understanding correction", async () => {
    const saveUserProfile = vi.fn(async () => undefined);
    useAppStore.setState({
      storage: { saveUserProfile } as never,
    });

    render(createElement(ProfilePanel));

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
    expect(useProfileStore.getState().lastCorrection).toBeNull();
  });
});
