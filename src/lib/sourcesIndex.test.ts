import { describe, expect, it } from "vitest";
import type { ConceptNode } from "@/domain/graph";
import {
  countSourcedConcepts,
  filterSourcedConcepts,
  indexSourcesByDomain,
  sourceDomainFromUrl,
} from "@/lib/sourcesIndex";

function makeNode(
  id: string,
  overrides: Partial<ConceptNode> = {},
): ConceptNode {
  return {
    id,
    title: `Concept ${id}`,
    intro: "intro",
    sourceUrl: `https://example.com/${id}`,
    archived: false,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("sourcesIndex (N2)", () => {
  it("extracts hostname without www", () => {
    expect(sourceDomainFromUrl("https://www.github.com/org/repo")).toBe(
      "github.com",
    );
  });

  it("excludes archived and nodes without sourceUrl", () => {
    const nodes = [
      makeNode("a"),
      makeNode("archived", { archived: true }),
      makeNode("no-url", { sourceUrl: null }),
      makeNode("blank", { sourceUrl: "   " }),
    ];
    expect(filterSourcedConcepts(nodes).map((n) => n.id)).toEqual(["a"]);
    expect(countSourcedConcepts(nodes)).toBe(1);
  });

  it("groups by domain with correct counts", () => {
    const nodes = [
      makeNode("e1", {
        sourceUrl: "https://example.com/one",
        updatedAt: "2026-06-01T00:00:00.000Z",
      }),
      makeNode("e2", {
        sourceUrl: "https://example.com/two",
        updatedAt: "2026-06-03T00:00:00.000Z",
      }),
      makeNode("g1", { sourceUrl: "https://github.com/x" }),
    ];

    const groups = indexSourcesByDomain(nodes);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.domain).toBe("example.com");
    expect(groups[0]?.items).toHaveLength(2);
    expect(groups[0]?.items[0]?.id).toBe("e2");
    expect(groups[1]?.domain).toBe("github.com");
    expect(groups[1]?.items).toHaveLength(1);
  });

  it("returns empty groups for empty input", () => {
    expect(indexSourcesByDomain([])).toEqual([]);
  });
});
