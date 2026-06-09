import { describe, expect, it, vi } from "vitest";
import { parseResearchMetadataFromAction } from "@/domain/actions/writingResearchMetadata";
import {
  generateResearchFollowups,
  RESEARCH_FOLLOWUP_GOLDEN_ID,
  RESEARCH_FOLLOWUP_ITEM_COUNT,
  researchFollowupMatchesGolden,
  researchUsesDuplicateIngestClaim,
} from "@/cognitive/generateResearchFollowups";
import { RADAR_FIXTURE_WORLD_ITEMS } from "@/radar/worldSources/fixtureWorldSource";
import {
  createShowcaseGraphSnapshot,
  showcaseIngestNodeFromGraph,
  SHOWCASE_GRAPH_SNAPSHOT,
  SHOWCASE_NOW,
} from "@/showcase/showcaseFixtures";

describe("generateResearchFollowups", () => {
  it("matches WRITING_RESEARCH_GOLDEN research entry with 3 fixture items", () => {
    const graph = createShowcaseGraphSnapshot();
    graph.nodes.push(showcaseIngestNodeFromGraph());
    const { action } = generateResearchFollowups({
      graph,
      worldItems: RADAR_FIXTURE_WORLD_ITEMS,
      createdAt: SHOWCASE_NOW,
    });
    expect(action).not.toBeNull();
    expect(researchFollowupMatchesGolden(action!)).toBe(true);
    expect(action!.id).toBe(RESEARCH_FOLLOWUP_GOLDEN_ID);
    expect(action!.status).toBe("draft");
    expect(action!.permissionLevel).toBe("suggest");
    const metadata = parseResearchMetadataFromAction(action!);
    expect(metadata?.researchItems).toHaveLength(RESEARCH_FOLLOWUP_ITEM_COUNT);
  });

  it("does not claim duplicate ingest concepts as new discoveries", () => {
    const graph = createShowcaseGraphSnapshot();
    graph.nodes.push(showcaseIngestNodeFromGraph());
    const { action } = generateResearchFollowups({
      graph,
      worldItems: RADAR_FIXTURE_WORLD_ITEMS,
    });
    expect(researchUsesDuplicateIngestClaim(action!)).toBe(false);
    const metadata = parseResearchMetadataFromAction(action!);
    for (const item of metadata!.researchItems) {
      expect(item.reason).not.toContain("新发现");
      expect(item.worldItemId?.startsWith("radar-wi-dup")).toBe(false);
    }
    const ingestedWorldItemId = "radar-wi-showcase-3";
    expect(
      metadata!.researchItems.some((item) => item.worldItemId === ingestedWorldItemId),
    ).toBe(false);
  });

  it("does not mutate graph when generating research followups", () => {
    const graph = createShowcaseGraphSnapshot();
    const before = structuredClone(graph);
    generateResearchFollowups({
      graph,
      worldItems: RADAR_FIXTURE_WORLD_ITEMS,
    });
    expect(graph).toEqual(before);
  });

  it("falls back to query-only items when worldItems empty", () => {
    const { action, warnings } = generateResearchFollowups({
      graph: SHOWCASE_GRAPH_SNAPSHOT,
      worldItems: [],
    });
    expect(action).not.toBeNull();
    expect(warnings.some((line) => line.includes("query-only"))).toBe(true);
    const metadata = parseResearchMetadataFromAction(action!);
    expect(metadata?.researchItems).toHaveLength(RESEARCH_FOLLOWUP_ITEM_COUNT);
    for (const item of metadata!.researchItems) {
      expect(item.query).toBeTruthy();
    }
  });

  it("never calls applyGraphMutation or network fetch", () => {
    const applyGraphMutation = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("blocked"));
    const graph = createShowcaseGraphSnapshot();
    generateResearchFollowups({ graph, worldItems: RADAR_FIXTURE_WORLD_ITEMS });
    expect(applyGraphMutation).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
