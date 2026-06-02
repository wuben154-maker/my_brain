import { describe, expect, it } from "vitest";
import { MockMemoryProvider } from "./mockMemoryProvider";

describe("MockMemoryProvider", () => {
  it("remember then recall hits related distilled text", async () => {
    const memory = new MockMemoryProvider();
    await memory.remember([
      {
        kind: "episode",
        text: "用户上次聊到对 AI Agent 框架很感兴趣",
        timestamp: Date.now(),
      },
    ]);

    const recalled = await memory.recall({
      query: "AI Agent 框架",
      topK: 5,
    });

    expect(recalled.length).toBeGreaterThan(0);
    expect(recalled[0]?.item.text).toContain("AI Agent");
  });

  it("respects topK", async () => {
    const memory = new MockMemoryProvider();
    await memory.remember([
      { kind: "episode", text: "RAG 检索增强", timestamp: 1 },
      { kind: "episode", text: "RAG 向量数据库", timestamp: 2 },
      { kind: "episode", text: "无关话题", timestamp: 3 },
    ]);

    const recalled = await memory.recall({ query: "RAG", topK: 1 });
    expect(recalled).toHaveLength(1);
  });

  it("filters by kinds", async () => {
    const memory = new MockMemoryProvider();
    await memory.remember([
      { kind: "episode", text: "情节：讨论了 Transformer", timestamp: 1 },
      { kind: "fact", text: "事实：用户偏好中文讲解", timestamp: 2 },
    ]);

    const factsOnly = await memory.recall({
      query: "用户偏好",
      kinds: ["fact"],
    });
    expect(factsOnly.every((entry) => entry.item.kind === "fact")).toBe(true);

    const episodesOnly = await memory.recall({
      query: "Transformer",
      kinds: ["episode"],
    });
    expect(episodesOnly.every((entry) => entry.item.kind === "episode")).toBe(
      true,
    );
  });

  it("returns empty set when nothing matches", async () => {
    const memory = new MockMemoryProvider();
    await memory.remember([
      { kind: "fact", text: "用户喜欢咖啡", timestamp: Date.now() },
    ]);

    const recalled = await memory.recall({ query: "量子计算" });
    expect(recalled).toEqual([]);
  });
});
