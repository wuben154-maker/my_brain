/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImmersiveScene } from "@/components/shell/ImmersiveScene";

vi.mock("react-force-graph-2d", () => ({
  default: () => createElement("div", { "data-testid": "force-graph-2d-mock" }),
}));

describe("ImmersiveScene (V0)", () => {
  afterEach(() => {
    cleanup();
  });

  it("mounts immersive scene, voice orb, and settings corner", () => {
    render(createElement(ImmersiveScene));
    expect(screen.getByTestId("immersive-scene")).toBeTruthy();
    expect(screen.getByTestId("voice-orb")).toBeTruthy();
    expect(screen.getByTestId("settings-corner")).toBeTruthy();
  });

  it("does not render HUD corner brackets on companion main", () => {
    render(createElement(ImmersiveScene));
    expect(screen.queryByTestId("sci-fi-corners")).toBeNull();
    expect(document.querySelectorAll(".sci-fi-corner")).toHaveLength(0);
  });

  it("renders full-screen graph with floating voice orb overlay (no split voice pane)", () => {
    render(createElement(ImmersiveScene));

    const graphPane = screen.getByTestId("graph-pane");
    const voiceOrbRegion = screen.getByTestId("voice-orb-region");
    const voiceOrb = screen.getByTestId("voice-orb");
    const scene = screen.getByTestId("immersive-scene");

    expect(graphPane).toBeTruthy();
    expect(voiceOrbRegion).toBeTruthy();
    expect(screen.queryByTestId("voice-pane")).toBeNull();
    expect(scene.contains(graphPane)).toBe(true);
    expect(scene.contains(voiceOrbRegion)).toBe(true);
    expect(voiceOrbRegion.className).toContain("absolute");
    expect(voiceOrbRegion.contains(voiceOrb)).toBe(true);
    expect(screen.getByTestId("relation-legend")).toBeTruthy();
    expect(screen.getByTestId("visual-voice-orb")).toBeTruthy();
    expect(screen.queryByTestId("voice-transcript-feed")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "主导航" })).toBeNull();
  });

  it("hides voice status card and connect/disconnect controls on companion main", () => {
    render(createElement(ImmersiveScene));
    expect(screen.getByTestId("voice-orb")).toBeTruthy();
    expect(screen.queryByText(/状态：/)).toBeNull();
    expect(screen.queryByRole("button", { name: "连接语音" })).toBeNull();
    expect(screen.queryByRole("button", { name: "打断" })).toBeNull();
    expect(screen.queryByRole("button", { name: "断开" })).toBeNull();
  });

  it("does not mount proposal inbox or inbox-approve UI (V4)", () => {
    render(createElement(ImmersiveScene));
    expect(screen.queryByTestId("proposal-inbox-inline")).toBeNull();
    expect(screen.queryByTestId("proposal-inbox-drawer")).toBeNull();
    expect(screen.queryByTestId("proposal-inbox-empty")).toBeNull();
    expect(screen.queryByTestId("inbox-bell")).toBeNull();
  });

  it("hides graph zoom HUD, stats, minimap, and listening bar on companion main", () => {
    render(createElement(ImmersiveScene));
    expect(screen.queryByLabelText("图谱缩放控件")).toBeNull();
    expect(screen.queryByLabelText("图谱深度")).toBeNull();
    expect(screen.queryByText("图谱统计")).toBeNull();
    expect(screen.queryByTestId("graph-minimap")).toBeNull();
    expect(screen.queryByTestId("visual-listening-bar")).toBeNull();
    expect(screen.queryByTestId("graph-stats-card")).toBeNull();
  });

  it("renders circular voice orb disc at V2 §4 footprint", () => {
    render(createElement(ImmersiveScene));
    const disc = document.querySelector(".companion-voice-orb-disc");
    expect(disc).toBeTruthy();
    expect(document.querySelector(".companion-voice-orb-ring-inner")).toBeTruthy();
    expect(document.querySelector(".companion-voice-orb-ring-mid")).toBeTruthy();
    expect(document.querySelector(".companion-voice-orb-energy-outer")).toBeTruthy();
    expect(document.querySelector(".companion-voice-orb-scan-arc")).toBeTruthy();
    expect(document.querySelector(".companion-voice-orb-wave")).toBeTruthy();
  });

  it("keeps only the settings gear as a visible companion control", () => {
    render(createElement(ImmersiveScene));
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.getAttribute("data-testid")).toBe("settings-corner");
    expect(screen.queryByRole("button", { name: "连接语音" })).toBeNull();
    expect(screen.queryByRole("button", { name: "模拟说话" })).toBeNull();
    expect(screen.queryByTestId("graph-undo-control")).toBeNull();
  });

  it("uses inline SVG settings gear instead of a text glyph", () => {
    render(createElement(ImmersiveScene));
    expect(screen.getByTestId("settings-gear-icon")).toBeTruthy();
    expect(screen.getByTestId("settings-corner").textContent).not.toContain("⚙");
  });

  it("renders decorative voice orb without button semantics", () => {
    render(createElement(ImmersiveScene));
    const orb = screen.getByTestId("visual-voice-orb");
    expect(orb.tagName.toLowerCase()).toBe("div");
    expect(orb.getAttribute("role")).toBeNull();
    expect(screen.queryByRole("button", { name: /说话|聆听|语音/ })).toBeNull();
  });
});
