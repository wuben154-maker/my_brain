import { describe, expect, it } from "vitest";
import { buildGraphOutline } from "@/lib/graphOutline";
import type { ConceptNode, GraphEdge } from "@/domain/graph";

function node(
  id: string,
  overrides: Partial<ConceptNode> = {},
): ConceptNode {
  return {
    id,
    title: id,
    intro: "",
    sourceUrl: null,
    archived: false,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function edge(sourceId: string, targetId: string): GraphEdge {
  return {
    id: `${sourceId}-${targetId}`,
    sourceId,
    targetId,
    relationType: "related",
  };
}

function collectIds(forest: ReturnType<typeof buildGraphOutline>): string[] {
  const ids: string[] = [];
  const walk = (entry: (typeof forest)[number]) => {
    ids.push(entry.node.id);
    for (const child of entry.children) {
      walk(child);
    }
  };
  for (const root of forest) {
    walk(root);
  }
  return ids;
}

describe("buildGraphOutline (N3)", () => {
  it("returns empty forest for no active nodes", () => {
    expect(buildGraphOutline([], [])).toEqual([]);
    expect(
      buildGraphOutline([node("a", { archived: true })], []),
    ).toEqual([]);
  });

  it("returns single root for one active node", () => {
    const forest = buildGraphOutline([node("solo")], []);
    expect(forest).toHaveLength(1);
    expect(forest[0]?.node.id).toBe("solo");
    expect(forest[0]?.children).toEqual([]);
  });

  it("builds layered tree along edges", () => {
    const nodes = [node("hub"), node("leaf")];
    const forest = buildGraphOutline(nodes, [edge("hub", "leaf")]);
    expect(forest).toHaveLength(1);
    expect(forest[0]?.node.id).toBe("hub");
    expect(forest[0]?.children[0]?.node.id).toBe("leaf");
    expect(forest[0]?.children[0]?.depth).toBe(1);
  });

  it("does not revisit nodes on cycles", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const edges = [edge("a", "b"), edge("b", "c"), edge("c", "a")];
    const ids = collectIds(buildGraphOutline(nodes, edges));
    expect(new Set(ids).size).toBe(3);
    expect(ids).toHaveLength(3);
  });

  it("excludes archived nodes and edges touching them", () => {
    const nodes = [
      node("active"),
      node("gone", { archived: true }),
      node("other"),
    ];
    const forest = buildGraphOutline(nodes, [
      edge("active", "gone"),
      edge("active", "other"),
    ]);
    const ids = collectIds(forest);
    expect(ids).toContain("active");
    expect(ids).toContain("other");
    expect(ids).not.toContain("gone");
  });

  it("covers disconnected components as multiple roots", () => {
    const nodes = [node("x"), node("y")];
    const forest = buildGraphOutline(nodes, []);
    expect(forest).toHaveLength(2);
    expect(collectIds(forest).sort()).toEqual(["x", "y"]);
  });
});
