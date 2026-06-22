import { describe, expect, it } from "vitest";

import {
  generateAdaptiveSignals,
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
  inferUserModeProfileFromDialogue,
} from "@my-brain/core";

import { buildTodayEntryViewModels, isTodayStorageEmpty } from "./todayEntryModel";

describe("todayEntryModel", () => {
  const profile = inferUserModeProfileFromDialogue(["我想跟进 AI 和开源"], "cold-tech-tracker");
  const signals = generateAdaptiveSignals(profile);

  it("derives entries from adaptive signals instead of fixed demo copy", () => {
    const entries = buildTodayEntryViewModels(profile, signals, 0);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]?.id).toBe("today-signal-0");
    expect(entries[0]?.title).not.toContain("新模型通道");
    expect(entries[0]?.reasonText).toMatch(/^原因：/);
  });

  it("includes graph/history resume entry after confirmed ingest", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    const before = graph.getSnapshot();
    const node = graph.createNode({
      concept: "Realtime API",
      intro: "语音伴侣相关概念",
      sourceLinks: ["https://example.com/realtime"],
    });
    history.pushChange({
      kind: "node_created",
      summary: "点亮「Realtime API」",
      before,
      after: graph.getSnapshot(),
      createdAt: new Date().toISOString(),
    });

    const entries = buildTodayEntryViewModels(profile, signals, 0, graph, history);
    const graphEntry = entries.find((entry) => entry.id === `today-graph-${node.id}`);
    expect(graphEntry).toBeTruthy();
    expect(graphEntry?.title).toBe("Realtime API");
    expect(graphEntry?.reasonText).toContain("Realtime API");
  });

  it("adds pending capture row only when count is positive", () => {
    const without = buildTodayEntryViewModels(profile, signals, 0);
    const withPending = buildTodayEntryViewModels(profile, signals, 2);
    expect(without.some((entry) => entry.id === "today-capture-pending")).toBe(false);
    expect(withPending.some((entry) => entry.id === "today-capture-pending")).toBe(true);
  });

  it("reports empty when profile missing or no derivable rows", () => {
    expect(isTodayStorageEmpty(null, signals, 0)).toBe(true);
    const bareProfile = { ...profile, recentIntent: undefined };
    expect(
      isTodayStorageEmpty(
        bareProfile,
        [],
        0,
        new InMemoryGraphRepository(),
        new InMemoryHistoryRepository(),
      ),
    ).toBe(true);
  });
});
