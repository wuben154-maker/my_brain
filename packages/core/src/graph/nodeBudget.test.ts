import { describe, expect, it } from "vitest";

import { InMemoryGraphRepository } from "../graph/memoryRepository.js";

describe("node budget invariant", () => {
  it("visible nodes stay within M1 budget of 80", () => {
    const graph = new InMemoryGraphRepository();
    for (let i = 0; i < 75; i += 1) {
      graph.createNode({ concept: `C${i}`, intro: "i", sourceLinks: [] });
    }
    expect(graph.countVisibleNodes()).toBeLessThanOrEqual(80);
  });
});
