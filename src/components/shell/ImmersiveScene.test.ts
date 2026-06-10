/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImmersiveScene } from "@/components/shell/ImmersiveScene";
import { briefingItemToNewsItem } from "@/domain/radar/briefingItem";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { buildDailyBriefing } from "@/radar/selectDailyBriefing";
import { rankWorldItems } from "@/radar/scoreWorldItems";
import {
  RADAR_FIXTURE_WORLD_ITEMS,
  RADAR_SHOWCASE_NOW,
} from "@/radar/worldSources/fixtureWorldSource";
import { createWorldItemStore } from "@/domain/radar/worldItemStore";
import { SHOWCASE_GRAPH_SNAPSHOT } from "@/showcase/showcaseFixtures";
import { useAppStore } from "@/stores/appStore";
import { useBriefingStore } from "@/stores/briefingStore";

vi.mock("react-force-graph-2d", () => ({
  default: () => createElement("div", { "data-testid": "force-graph-2d-mock" }),
}));

function seedCompanionRadarBriefing(): ReturnType<typeof buildDailyBriefing> {
  const store = createWorldItemStore();
  store.upsertMany(RADAR_FIXTURE_WORLD_ITEMS);
  store.expire(RADAR_SHOWCASE_NOW);
  const ranked = rankWorldItems({
    graph: SHOWCASE_GRAPH_SNAPSHOT,
    profile: DEFAULT_USER_PROFILE,
    items: store.listActive(),
  });
  return buildDailyBriefing({ ranked });
}

describe("ImmersiveScene (V0)", () => {
  afterEach(() => {
    cleanup();
    useBriefingStore.getState().clear();
    useAppStore.setState({ phase: "self_check", newsQueue: [] });
  });

  it("mounts immersive scene, voice orb, and settings corner", () => {
    render(createElement(ImmersiveScene));
    expect(screen.getByTestId("immersive-scene")).toBeTruthy();
    expect(screen.getByTestId("voice-orb")).toBeTruthy();
    expect(screen.getByTestId("settings-corner")).toBeTruthy();
    expect(screen.getByTestId("companion-shell")).toBeTruthy();
    expect(screen.getByTestId("companion-shell-surface")).toBeTruthy();
    expect(screen.getByTestId("companion-shell-review-entry-carrier")).toBeTruthy();
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
    expect(screen.getByTestId("companion-shell-radar-slot")).toBeTruthy();
    expect(screen.getByTestId("companion-shell-curation-slot")).toBeTruthy();
    expect(screen.getByTestId("companion-shell-review-slot")).toBeTruthy();
    expect(screen.getByTestId("companion-shell-action-slot")).toBeTruthy();
    expect(screen.getByTestId("companion-shell-surface")).toBeTruthy();
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

  it("keeps settings as the only visible control when radar shell is idle", () => {
    render(createElement(ImmersiveScene));
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.getAttribute("data-testid")).toBe("settings-corner");
    expect(screen.queryByRole("button", { name: "连接语音" })).toBeNull();
    expect(screen.queryByRole("button", { name: "模拟说话" })).toBeNull();
    expect(screen.queryByTestId("graph-undo-control")).toBeNull();
  });

  it("auto-opens radar companion shell with signal explanations after launch data", () => {
    const briefing = seedCompanionRadarBriefing();
    useBriefingStore.getState().setTodayItems(briefing);
    useAppStore.setState({
      phase: "companion",
      newsQueue: briefing.map((item) => briefingItemToNewsItem(item)),
    });

    render(createElement(ImmersiveScene));

    expect(screen.getByTestId("companion-shell").getAttribute("data-active-slot")).toBe(
      "radar",
    );
    expect(screen.getByTestId("radar-companion-card")).toBeTruthy();
    expect(screen.getByTestId("radar-companion-item-1")).toBeTruthy();
    expect(screen.getByTestId("radar-companion-item-2")).toBeTruthy();
    expect(screen.getByTestId("radar-companion-item-3")).toBeTruthy();

    for (const item of briefing) {
      expect(screen.getByTestId(`briefing-signal-${item.worldItem.id}`)).toBeTruthy();
    }

    expect(screen.getByTestId("companion-shell-close")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "入库?" })).toBeNull();
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
