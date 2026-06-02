import { describe, expect, it } from "vitest";
import type { RecalledMemory } from "@/providers/memory/types";
import {
  buildGroundingContext,
  distilledMemoryItemsFromTranscript,
  selectRecallMix,
  stripMemoryPrefixFromContext,
} from "./memoryGrounding";

function entry(
  text: string,
  score: number,
  timestamp: number,
  id?: string,
): RecalledMemory {
  return {
    item: { kind: "episode", text, timestamp, id },
    score,
  };
}

describe("memoryGrounding", () => {
  it("selectRecallMix favors 80% high-score and 20% stable", () => {
    const recalled = [
      entry("最新高分", 0.9, 100),
      entry("次高分", 0.8, 200),
      entry("第三", 0.7, 300),
      entry("最旧稳定", 0.2, 10),
      entry("次新稳定", 0.3, 20),
    ];

    const mixed = selectRecallMix(recalled);
    expect(mixed).toHaveLength(5);
    expect(mixed[0]?.item.text).toBe("最新高分");
    expect(mixed.some((item) => item.item.text === "最旧稳定")).toBe(true);
  });

  it("selectRecallMix handles empty and small sets", () => {
    expect(selectRecallMix([])).toEqual([]);
    expect(selectRecallMix([entry("唯一", 1, 1)])).toHaveLength(1);
  });

  it("buildGroundingContext wraps memories and enforces max length", () => {
    const long = buildGroundingContext(
      [entry("x".repeat(2000), 1, 1)],
      { maxChars: 50 },
    );
    expect(long.startsWith("<memory>")).toBe(true);
    expect(long.endsWith("</memory>")).toBe(true);
    expect(long.length).toBeLessThan(2000);
  });

  it("stripMemoryPrefixFromContext removes memory block", () => {
    const raw =
      '<memory>\n- 记得 RAG\n</memory>\n{"newsItem":{"title":"RAG"}}';
    expect(stripMemoryPrefixFromContext(raw)).toBe('{"newsItem":{"title":"RAG"}}');
  });

  it("distilledMemoryItemsFromTranscript keeps user lines only", () => {
    const items = distilledMemoryItemsFromTranscript(
      "用户: 我对 Agent 感兴趣\n助手: 好的，我来解释",
    );
    expect(items).toHaveLength(2);
    expect(items[0]?.kind).toBe("episode");
    expect(items[0]?.text).toContain("Agent");
    expect(items[0]?.text).not.toContain("助手:");
    expect(items[1]?.kind).toBe("fact");
    expect(items[1]?.text).toContain("Agent");
  });
});
