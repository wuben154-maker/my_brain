import { describe, expect, it } from "vitest";

import type { UserMode, UserModeProfile } from "../domain/userMode.js";
import { USER_MODES } from "../domain/userMode.js";
import { InMemoryGraphRepository } from "../graph/memoryRepository.js";
import { inferUserModeProfileFromDialogue } from "../radar/adaptiveRadar.js";
import {
  assertWorldObserverDoesNotMutateGraph,
  buildWorldItemFromHeadline,
  buildWorldSignal,
  observeWorldHeadlines,
  WORLD_OBSERVER_FIXTURE_HEADLINES,
  worldItemDisplayTime,
} from "./worldObserver.js";

const TECH_PROFILE: UserModeProfile = inferUserModeProfileFromDialogue(
  [],
  "cold-tech-tracker",
);

const FIXED_OBSERVED_AT = "2026-06-21T10:00:00.000Z";

describe("world observer — CK-14", () => {
  it("buildWorldItemFromHeadline normalizes external headline with plan fields", () => {
    const item = buildWorldItemFromHeadline(
      {
        title: "Realtime voice agents on GitHub",
        url: "https://github.com/org/live-agent",
        sourceType: "github",
        source: "GitHub Trending",
        summary: "Trending repo for voice agents",
        publishedAt: "2026-06-20T08:00:00.000Z",
      },
      FIXED_OBSERVED_AT,
    );

    expect(item.id).toMatch(/^world-/);
    expect(item.title).toBe("Realtime voice agents on GitHub");
    expect(item.summary).toContain("voice agents");
    expect(item.source).toBe("GitHub Trending");
    expect(item.url).toContain("github.com");
    expect(item.sourceType).toBe("github");
    expect(item.publishedAt).toBe("2026-06-20T08:00:00.000Z");
    expect(item.observedAt).toBe(FIXED_OBSERVED_AT);
    expect(worldItemDisplayTime(item)).toBe("2026-06-20T08:00:00.000Z");
  });

  it("defaults source label from sourceType when source omitted", () => {
    const item = buildWorldItemFromHeadline({
      title: "AI weekly digest",
      url: "https://example.com/rss/ai-weekly",
      sourceType: "rss",
    });

    expect(item.source).toBe("RSS");
  });

  it("worldItemDisplayTime falls back to observedAt when publishedAt is null", () => {
    const item = buildWorldItemFromHeadline(
      {
        title: "Draft note",
        url: "https://example.com/draft",
        sourceType: "blog",
      },
      FIXED_OBSERVED_AT,
    );

    expect(item.publishedAt).toBeNull();
    expect(worldItemDisplayTime(item)).toBe(FIXED_OBSERVED_AT);
  });

  it("buildWorldSignal includes evidence and whyUsefulToUser", () => {
    const item = buildWorldItemFromHeadline({
      title: "OpenAI Realtime API update",
      url: "https://example.com/news/realtime",
      sourceType: "news",
      source: "AI 新闻",
    });
    const profile: UserModeProfile = {
      ...TECH_PROFILE,
      recentIntent: "Realtime API",
    };

    const signal = buildWorldSignal(item, profile);

    expect(signal.worldItemId).toBe(item.id);
    expect(signal.evidence).toContain(`world-item:${item.id}`);
    expect(signal.evidence).toContain(`url:${item.url}`);
    expect(signal.evidence).toContain(`source:${item.source}`);
    expect(signal.evidence).toContain(`source-type:${item.sourceType}`);
    expect(signal.evidence).toContain(`time:${worldItemDisplayTime(item)}`);
    expect(signal.whyUsefulToUser).toContain("技术趋势");
    expect(signal.whyUsefulToUser).toContain("Realtime API");
    expect(signal.userModeFit).toBe("tech_tracker");
    expect(signal.confidence).toBeGreaterThan(0.5);
  });

  it("tailors whyUsefulToUser per user mode", () => {
    const item = buildWorldItemFromHeadline({
      title: "Voice provider landscape",
      url: "https://example.com/voice",
      sourceType: "news",
    });

    const modeSnippets: Record<UserMode, string> = {
      tech_tracker: "技术趋势",
      learner: "学习主题",
      creator_researcher: "研究或内容创作",
      founder_project: "项目或决策",
      personal_memory: "不会自动入库",
    };

    for (const mode of USER_MODES) {
      const profile: UserModeProfile = { ...TECH_PROFILE, primaryMode: mode };
      const signal = buildWorldSignal(item, profile);
      expect(signal.whyUsefulToUser).toContain(modeSnippets[mode]);
      expect(signal.userModeFit).toBe(mode);
    }
  });

  it("observeWorldHeadlines returns signal pairs without graph mutation", () => {
    const graph = new InMemoryGraphRepository();
    const beforeNodes = graph.countVisibleNodes();
    const profile: UserModeProfile = {
      ...TECH_PROFILE,
      recentIntent: "Realtime transport",
    };

    const observations = observeWorldHeadlines(
      WORLD_OBSERVER_FIXTURE_HEADLINES,
      profile,
      FIXED_OBSERVED_AT,
    );

    expect(observations).toHaveLength(3);
    for (const { item, signal } of observations) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.source.length).toBeGreaterThan(0);
      expect(signal.evidence.length).toBeGreaterThanOrEqual(4);
      expect(signal.whyUsefulToUser.length).toBeGreaterThan(0);
      expect(signal.worldItemId).toBe(item.id);
    }

    assertWorldObserverDoesNotMutateGraph(graph, beforeNodes);
    expect(graph.countVisibleNodes()).toBe(beforeNodes);
  });

  it("assertWorldObserverDoesNotMutateGraph rejects graph growth", () => {
    const graph = new InMemoryGraphRepository();
    const beforeNodes = graph.countVisibleNodes();
    graph.createNode({ concept: "Leaked", intro: "should not happen", sourceLinks: [] });

    expect(() => assertWorldObserverDoesNotMutateGraph(graph, beforeNodes)).toThrow(
      /must not create permanent graph nodes/,
    );
  });

  it("rejects empty headline fields", () => {
    expect(() =>
      buildWorldItemFromHeadline({ title: "", url: "https://x.test", sourceType: "rss" }),
    ).toThrow(/title and url/);
    expect(() =>
      buildWorldItemFromHeadline({ title: "Valid", url: "  ", sourceType: "rss" }),
    ).toThrow(/title and url/);
  });
});
