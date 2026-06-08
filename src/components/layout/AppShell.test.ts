/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/AppShell";
import { useAppStore } from "@/stores/appStore";

vi.mock("@/hooks/useProposalInboxInit", () => ({
  useProposalInboxInit: () => undefined,
}));

vi.mock("@/hooks/useAgentScheduler", () => ({
  useAgentScheduler: () => undefined,
}));

describe("AppShell (V0 immersive shell)", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    useAppStore.setState({
      phase: "companion",
      errorMessage: null,
      storage: null,
      providers: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders ImmersiveScene when phase is companion", () => {
    render(createElement(AppShell));
    expect(screen.getByTestId("immersive-scene")).toBeTruthy();
    expect(screen.queryByTestId("main-shell")).toBeNull();
  });

  it("does not render NavRail during self_check", () => {
    useAppStore.setState({ phase: "self_check" });
    render(createElement(AppShell));
    expect(screen.queryByRole("navigation", { name: "主导航" })).toBeNull();
    expect(screen.queryByTestId("immersive-scene")).toBeNull();
  });

  it("does not render NavRail during loading", () => {
    useAppStore.setState({ phase: "loading" });
    render(createElement(AppShell));
    expect(screen.queryByRole("navigation", { name: "主导航" })).toBeNull();
    expect(screen.queryByTestId("immersive-scene")).toBeNull();
  });

  it("renders self-check for legacy boot phase without BootBrainSphere", () => {
    useAppStore.setState({ phase: "boot" });
    render(createElement(AppShell));
    expect(screen.getByTestId("companion-selfcheck-screen")).toBeTruthy();
    expect(screen.queryByTestId("boot-self-check")).toBeNull();
    expect(screen.queryByTestId("immersive-scene")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "主导航" })).toBeNull();
  });

  it("shows companion self-check at default launch phase (no boot flash)", () => {
    useAppStore.setState({
      phase: "self_check",
      errorMessage: null,
      storage: null,
      providers: null,
      selfChecks: [{ id: "mic", label: "麦克风", status: "pending" }],
    });
    render(createElement(AppShell));
    expect(screen.getByTestId("companion-selfcheck-screen")).toBeTruthy();
    expect(screen.queryByTestId("boot-intro-screen")).toBeNull();
    expect(screen.queryByTestId("immersive-scene")).toBeNull();
  });

  it("retires ?visual=main and keeps immersive companion shell", () => {
    window.history.replaceState({}, "", "/?visual=main");
    render(createElement(AppShell));
    expect(screen.getByTestId("immersive-scene")).toBeTruthy();
    expect(screen.queryByTestId("main-shell")).toBeNull();
  });
});
