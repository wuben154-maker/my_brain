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

  it("renders boot intro without immersive scene or nav", () => {
    useAppStore.setState({ phase: "boot" });
    render(createElement(AppShell));
    expect(screen.getByTestId("boot-intro-screen")).toBeTruthy();
    expect(screen.queryByTestId("immersive-scene")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "主导航" })).toBeNull();
  });

  it("keeps frozen ?visual=main layout", () => {
    window.history.replaceState({}, "", "/?visual=main");
    render(createElement(AppShell));
    expect(screen.getByTestId("main-shell")).toBeTruthy();
    expect(screen.queryByTestId("immersive-scene")).toBeNull();
  });
});
