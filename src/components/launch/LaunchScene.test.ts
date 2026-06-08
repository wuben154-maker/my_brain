/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LaunchScene } from "@/components/launch/LaunchScene";
import { useAppStore } from "@/stores/appStore";

const readVisualSnapshotId = vi.hoisted(() => vi.fn(() => null as string | null));

vi.mock("@/lib/visualSnapshotMode", () => ({
  readVisualSnapshotId: () => readVisualSnapshotId(),
}));

vi.mock("@/lib/runLaunchSequence", () => ({
  skipLaunchSelfCheckSpeech: vi.fn(),
}));

describe("LaunchScene (V2 launch smoke)", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    readVisualSnapshotId.mockReturnValue(null);
    useAppStore.setState({
      phase: "self_check",
      selfChecks: [
        { id: "mic", label: "麦克风", status: "ok" },
        { id: "storage", label: "大脑读写", status: "syncing" },
      ],
      errorMessage: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders companion self-check on normal launch path", () => {
    render(createElement(LaunchScene));
    expect(screen.getByTestId("companion-selfcheck-screen")).toBeTruthy();
    expect(screen.queryByTestId("boot-intro-screen")).toBeNull();
    expect(screen.queryByTestId("boot-self-check")).toBeNull();
  });

  it("never mounts boot intro on self_check without legacy visual=boot", () => {
    useAppStore.setState({ phase: "self_check" });
    render(createElement(LaunchScene));
    expect(screen.queryByTestId("boot-intro-screen")).toBeNull();
    expect(document.querySelector(".boot-brain-sphere")).toBeNull();
  });

  it("mounts legacy BootSelfCheck only when visual=boot", () => {
    readVisualSnapshotId.mockReturnValue("boot");
    useAppStore.setState({ phase: "self_check" });
    render(createElement(LaunchScene));
    expect(screen.getByTestId("boot-self-check")).toBeTruthy();
    expect(screen.queryByTestId("companion-selfcheck-screen")).toBeNull();
  });

  it("renders loading screen after self_check completes", () => {
    useAppStore.setState({ phase: "loading", loadingMessage: "正在唤醒大脑…" });
    render(createElement(LaunchScene));
    expect(screen.getByText("数据流注入")).toBeTruthy();
    expect(screen.queryByTestId("companion-selfcheck-screen")).toBeNull();
  });
});
