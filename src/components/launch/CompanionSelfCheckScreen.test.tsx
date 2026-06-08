/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CompanionSelfCheckScreen } from "@/components/launch/CompanionSelfCheckScreen";
import { useAppStore } from "@/stores/appStore";

describe("CompanionSelfCheckScreen", () => {
  beforeEach(() => {
    useAppStore.setState({
      selfChecks: [
        { id: "mic", label: "麦克风", status: "ok" },
        { id: "speaker", label: "扬声器", status: "ok" },
        { id: "network", label: "网络", status: "ok" },
        { id: "news", label: "资讯源", status: "ok" },
        { id: "storage", label: "大脑读写", status: "syncing" },
      ],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows zh-CN self-check rows without extra action buttons", () => {
    render(createElement(CompanionSelfCheckScreen));
    expect(screen.getByTestId("companion-selfcheck-screen")).toBeTruthy();
    expect(screen.getByText("语音播报自检中…")).toBeTruthy();
    expect(screen.getByText("系统启动序列")).toBeTruthy();
    expect(screen.getByText("正在初始化 Second Brain")).toBeTruthy();
    expect(screen.getByText("系统诊断")).toBeTruthy();
    expect(screen.getByText("麦克风")).toBeTruthy();
    expect(screen.getByText("大脑读写")).toBeTruthy();
    expect(screen.getByText("AUDIO INPUT")).toBeTruthy();
    expect(screen.queryByText("MICROPHONE")).toBeNull();
    const skip = screen.getByRole("button", { name: "跳过语音播报", hidden: true });
    expect(skip.className).toContain("sr-only");
  });

  it("renders HUD chrome, progress bar, and passive voice orb", () => {
    render(createElement(CompanionSelfCheckScreen));
    expect(screen.getByTestId("companion-selfcheck-top")).toBeTruthy();
    expect(screen.getByTestId("companion-selfcheck-orb")).toBeTruthy();
    expect(screen.getByTestId("companion-selfcheck-progress")).toBeTruthy();
    expect(document.querySelector(".companion-selfcheck-progress-fill")).toBeTruthy();
    expect(document.querySelector(".companion-selfcheck-orb-ring-outer")).toBeTruthy();
    expect(document.querySelector(".companion-selfcheck-orb-scan")).toBeTruthy();
    expect(screen.getByTestId("companion-selfcheck-telemetry")).toBeTruthy();
    expect(screen.queryByTestId("sci-fi-corners")).toBeNull();
    expect(document.querySelectorAll(".sci-fi-corner")).toHaveLength(0);
  });
});
