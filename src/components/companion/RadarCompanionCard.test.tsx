/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RadarCompanionCard } from "@/components/companion/RadarCompanionCard";
import {
  briefingItemToNewsItem,
  getBriefingItemNewsId,
} from "@/domain/radar/briefingItem";
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
import { useIngestStore } from "@/stores/ingestStore";

function seedBriefingTop3(): ReturnType<typeof buildDailyBriefing> {
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

describe("RadarCompanionCard", () => {
  beforeEach(() => {
    useBriefingStore.getState().clear();
    useIngestStore.getState().reset();
    useAppStore.setState({ newsQueue: [], phase: "companion" });
  });

  afterEach(() => {
    cleanup();
    useBriefingStore.getState().clear();
    useIngestStore.getState().reset();
  });

  it("renders empty state when briefing has no items", () => {
    render(createElement(RadarCompanionCard));
    expect(screen.getByTestId("radar-companion-card").textContent).toContain(
      "今天没有足够相关的新变化",
    );
  });

  it("renders top 3 titles with at least one signal chip each", () => {
    const briefing = seedBriefingTop3();
    useBriefingStore.getState().setTodayItems(briefing);
    useAppStore.setState({
      newsQueue: briefing.map((item) => briefingItemToNewsItem(item)),
    });

    render(createElement(RadarCompanionCard));

    expect(screen.getByTestId("radar-companion-item-1")).toBeTruthy();
    expect(screen.getByTestId("radar-companion-item-2")).toBeTruthy();
    expect(screen.getByTestId("radar-companion-item-3")).toBeTruthy();

    for (const item of briefing) {
      expect(screen.getByText(item.worldItem.title)).toBeTruthy();
      expect(screen.getByTestId(`briefing-signal-${item.worldItem.id}`)).toBeTruthy();
    }
  });

  it("highlights the row matching ingest cursor", () => {
    const briefing = seedBriefingTop3();
    useBriefingStore.getState().setTodayItems(briefing);
    useAppStore.setState({
      newsQueue: briefing.map((item) => briefingItemToNewsItem(item)),
    });
    useIngestStore.getState().setCursor(1);

    render(createElement(RadarCompanionCard));

    expect(screen.getByTestId("radar-companion-item-2").getAttribute("data-highlighted")).toBe(
      "true",
    );
    expect(screen.getByTestId("radar-companion-item-1").getAttribute("data-highlighted")).toBe(
      "false",
    );
  });

  it("focuses ingest cursor when a row is clicked", () => {
    const briefing = seedBriefingTop3();
    useBriefingStore.getState().setTodayItems(briefing);
    useAppStore.setState({
      newsQueue: briefing.map((item) => briefingItemToNewsItem(item)),
    });

    render(createElement(RadarCompanionCard));
    const third = briefing.find((item) => item.briefingRank === 3)!;
    const row = screen.getByTestId("radar-companion-item-3");
    fireEvent.click(row.querySelector("button")!);

    expect(useIngestStore.getState().cursor).toBe(2);
    expect(useIngestStore.getState().activeNewsId).toBe(
      getBriefingItemNewsId(third),
    );
  });

  it("shows why-recommend rationale and records feedback", async () => {
    const briefing = seedBriefingTop3();
    useBriefingStore.getState().setTodayItems(briefing);
    useAppStore.setState({
      newsQueue: briefing.map((item) => briefingItemToNewsItem(item)),
    });

    render(createElement(RadarCompanionCard));

    const firstItem = briefing[0]!;
    fireEvent.click(screen.getByTestId(`radar-why-link-${firstItem.worldItem.id}`));
    expect(screen.getByTestId(`radar-rationale-${firstItem.worldItem.id}`)).toBeTruthy();

    fireEvent.click(
      screen.getByTestId(
        `briefing-feedback-${firstItem.worldItem.id}-not_interested`,
      ),
    );
    await vi.waitFor(() => {
      expect(
        useBriefingStore.getState().feedbackByItemId[firstItem.worldItem.id]?.[0]
          ?.kind,
      ).toBe("not_interested");
    });
  });

  it("does not expose silent graph create controls", () => {
    const briefing = seedBriefingTop3();
    useBriefingStore.getState().setTodayItems(briefing);
    useAppStore.setState({
      newsQueue: briefing.map((item) => briefingItemToNewsItem(item)),
    });

    render(createElement(RadarCompanionCard));

    expect(screen.queryByRole("button", { name: "入库?" })).toBeNull();
    expect(screen.queryByRole("button", { name: /入库/ })).toBeNull();
  });
});
