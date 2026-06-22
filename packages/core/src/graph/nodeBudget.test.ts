import { describe, expect, it } from "vitest";

import { InMemoryGraphRepository } from "../graph/memoryRepository.js";
import {
  BRAIN_MAP_VISIBLE_MAX,
  BRAIN_MAP_VISIBLE_MIN,
  clampNodeBudget,
  isWithinNodeBudget,
  selectBudgetedNodes,
} from "./nodeBudget.js";

describe("nodeBudget", () => {
  it("clamps requested budget to 1..80", () => {
    expect(clampNodeBudget()).toBe(BRAIN_MAP_VISIBLE_MAX);
    expect(clampNodeBudget(120)).toBe(BRAIN_MAP_VISIBLE_MAX);
    expect(clampNodeBudget(0)).toBe(1);
    expect(clampNodeBudget(45)).toBe(45);
  });

  it("selectBudgetedNodes excludes archived by default", () => {
    const nodes = [
      {
        id: "a",
        concept: "A",
        intro: "i",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-06-17T10:00:00.000Z",
      },
      {
        id: "b",
        concept: "B",
        intro: "i",
        sourceLinks: [],
        archived: true,
        createdAt: "2026-06-17T09:00:00.000Z",
      },
    ];
    expect(selectBudgetedNodes(nodes).map((n) => n.id)).toEqual(["a"]);
    expect(selectBudgetedNodes(nodes, { includeArchived: true }).map((n) => n.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("visible nodes stay within budget of 80", () => {
    const graph = new InMemoryGraphRepository();
    for (let i = 0; i < 75; i += 1) {
      graph.createNode({ concept: `C${i}`, intro: "i", sourceLinks: [] });
    }
    const selected = selectBudgetedNodes(graph.getSnapshot().nodes);
    expect(selected.length).toBeLessThanOrEqual(BRAIN_MAP_VISIBLE_MAX);
    expect(graph.countVisibleNodes()).toBeLessThanOrEqual(BRAIN_MAP_VISIBLE_MAX);
  });

  it("supports plan range 30-80 for map exploration", () => {
    expect(BRAIN_MAP_VISIBLE_MIN).toBe(30);
    expect(BRAIN_MAP_VISIBLE_MAX).toBe(80);
    expect(isWithinNodeBudget(80)).toBe(true);
    expect(isWithinNodeBudget(81)).toBe(false);
  });

  it("never selects more than budget when library is large", () => {
    const graph = new InMemoryGraphRepository();
    for (let i = 0; i < 200; i += 1) {
      graph.createNode({ concept: `C${i}`, intro: "i", sourceLinks: [] });
    }
    const selected = selectBudgetedNodes(graph.getSnapshot().nodes);
    expect(selected.length).toBe(BRAIN_MAP_VISIBLE_MAX);
    expect(graph.countVisibleNodes()).toBe(200);
  });
});
