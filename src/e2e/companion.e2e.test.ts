import { describe, expect, it } from "vitest";
import { applyIngestCreate } from "@/conversation/ingestActions";
import { createTempStorage } from "@/invariants/testStorage";
import { planWalkthrough } from "@/lib/graphOutline";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import { useIngestStore } from "@/stores/ingestStore";
import type { NewsItem } from "@/domain/news";

const newsItem: NewsItem = {
  id: "news-e2e",
  category: "ai_news",
  title: "Agent Framework update",
  summary: "New agent framework release",
  sourceName: "Example",
  sourceUrl: "https://example.com/agent",
  publishedAt: "2026-06-01T00:00:00.000Z",
};

describe("companion e2e (V4 smoke)", () => {
  it("ingest create then plan walkthrough highlights", async () => {
    const fixture = createTempStorage("better-sqlite3");
    await fixture.storage.init();
    useIngestStore.getState().reset();
    useIngestStore.getState().setExplanation("e2e intro");

    const { nodeId } = await applyIngestCreate(newsItem, {
      storage: fixture.storage,
      llm: createMockLlmProvider(),
      profile: DEFAULT_USER_PROFILE,
    });

    expect(nodeId).toBeTruthy();
    const graph = await fixture.storage.loadGraph();
    const steps = planWalkthrough(newsItem.title, graph);
    expect(Array.isArray(steps)).toBe(true);

    fixture.cleanup();
  });
});
