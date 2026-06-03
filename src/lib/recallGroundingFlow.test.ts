import { describe, expect, it, vi } from "vitest";
import type { MemoryProvider } from "@/providers/memory/types";
import { MockMemoryProvider } from "@/providers/memory/mockMemoryProvider";
import {
  distilledMemoryItemsFromTranscript,
  recallGroundingContext,
} from "@/lib/memoryGrounding";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
describe("recall grounding flow (M1)", () => {
  it("recall returns empty grounding when memory is unavailable", async () => {
    const grounding = await recallGroundingContext(undefined, "RAG");
    expect(grounding).toBe("");
  });

  it("propose path receives memory prefix when recall hits", async () => {
    const memory = new MockMemoryProvider();
    await memory.remember([
      {
        kind: "episode",
        text: "用户之前聊过 RAG 向量检索",
        timestamp: Date.now(),
      },
    ]);

    const llm = createMockLlmProvider();
    const proposeSpy = vi.spyOn(llm, "proposeGraphMutations");

    const grounding = await recallGroundingContext(memory, "RAG 向量");
    const payload = JSON.stringify({
      newsItem: {
        id: "n1",
        category: "ai_news",
        title: "RAG 新进展",
        summary: "检索增强",
        sourceName: "Mock",
        sourceUrl: "https://example.com",
        publishedAt: null,
      },
      nodes: [],
    });

    await llm.proposeGraphMutations(`${grounding}\n\n${payload}`);
    expect(proposeSpy).toHaveBeenCalledOnce();
    expect(String(proposeSpy.mock.calls[0]?.[0])).toContain("<memory>");
  });

  it("remember on session end uses distilled user text only", async () => {
    const memory = new MockMemoryProvider();
    const rememberSpy = vi.spyOn(memory, "remember");
    const items = distilledMemoryItemsFromTranscript(
      "用户: 我想了解 Agent\n助手: 好的，Agent 是…",
    );
    await memory.remember(items);

    expect(rememberSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        kind: "episode",
        text: expect.stringContaining("Agent"),
      }),
      expect.objectContaining({
        kind: "fact",
        text: expect.stringContaining("Agent"),
      }),
    ]);
    expect(String(rememberSpy.mock.calls[0]?.[0]?.[0]?.text)).not.toContain(
      "助手:",
    );
  });

  it("second recall on same topic surfaces prior session memory (M1 DoD)", async () => {
    const memory = new MockMemoryProvider();
    const transcript =
      "用户: 我对 RAG 向量检索很感兴趣\n助手: RAG 是把检索和生成结合起来…";
    await memory.remember(distilledMemoryItemsFromTranscript(transcript));

    const first = await recallGroundingContext(memory, "RAG");
    expect(first).toContain("<memory>");
    expect(first).toContain("RAG");

    const second = await recallGroundingContext(memory, "RAG 向量检索");
    expect(second).toContain("RAG");
    expect(second).toContain("对话摘要");
  });

  it("degrades when recall throws without breaking callers", async () => {
    const memory: MemoryProvider = {
      remember: vi.fn(async () => undefined),
      recall: vi.fn(async () => {
        throw new Error("sidecar down");
      }),
      health: vi.fn(async () => ({ ok: false, detail: "down" })),
    };

    const grounding = await recallGroundingContext(memory, "anything");
    expect(grounding).toBe("");
  });

  it("uses coarse-to-fine recall sequence when grounding (M3)", async () => {
    const memory = new MockMemoryProvider();
    await memory.remember([
      {
        kind: "episode",
        text: "用户关注 RAG 主题",
        timestamp: Date.now(),
      },
      {
        kind: "fact",
        text: "RAG 向量检索细节",
        timestamp: Date.now() + 1,
      },
    ]);

    const recallSpy = vi.spyOn(memory, "recall");
    const grounding = await recallGroundingContext(memory, "RAG");

    expect(recallSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(grounding).toContain("<memory>");
    expect(grounding).toContain("RAG");
  });

  it("degrades when recall returns empty without throwing", async () => {
    const memory: MemoryProvider = {
      remember: vi.fn(async () => undefined),
      recall: vi.fn(async () => []),
      health: vi.fn(async () => ({ ok: false, detail: "down" })),
    };

    const grounding = await recallGroundingContext(memory, "anything");
    expect(grounding).toBe("");
    expect(memory.recall).toHaveBeenCalled();
  });
});
