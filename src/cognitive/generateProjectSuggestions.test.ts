import { describe, expect, it } from "vitest";
import { isProjectSuggestionMetadata } from "@/domain/actions/cognitiveAction";
import { parseMetadataFromAction } from "@/domain/actions/projectSuggestionMetadata";
import {
  generateProjectSuggestions,
  pa1IncludesGraphitiNode,
  projectSuggestionsMatchGolden,
} from "@/cognitive/generateProjectSuggestions";
import {
  PROJECT_SUGGESTIONS_GOLDEN,
  PROJECT_SUGGESTION_TREND_FIXTURE_ID,
} from "@/cognitive/projectSuggestionsGolden";
import { RADAR_FIXTURE_WORLD_ITEMS } from "@/radar/worldSources/fixtureWorldSource";
import {
  createShowcaseGraphSnapshot,
  showcaseIngestNodeFromGraph,
  SHOWCASE_GRAPH_SNAPSHOT,
  SHOWCASE_NOW,
} from "@/showcase/showcaseFixtures";

describe("generateProjectSuggestions", () => {
  it("matches PROJECT_SUGGESTIONS_GOLDEN on showcase graph without graphiti", () => {
    const { actions } = generateProjectSuggestions({
      graph: SHOWCASE_GRAPH_SNAPSHOT,
      trendItems: RADAR_FIXTURE_WORLD_ITEMS,
      createdAt: SHOWCASE_NOW,
    });
    expect(actions).toHaveLength(2);
    expect(projectSuggestionsMatchGolden(actions, { includesGraphiti: false })).toBe(true);
    expect(pa1IncludesGraphitiNode(actions)).toBe(false);
  });

  it("matches golden with graphiti node linked on pa-1", () => {
    const graph = createShowcaseGraphSnapshot();
    graph.nodes.push(showcaseIngestNodeFromGraph());
    const { actions } = generateProjectSuggestions({
      graph,
      trendItems: RADAR_FIXTURE_WORLD_ITEMS,
      createdAt: SHOWCASE_NOW,
    });
    expect(projectSuggestionsMatchGolden(actions, { includesGraphiti: true })).toBe(true);
    expect(pa1IncludesGraphitiNode(actions)).toBe(true);
  });

  it("every action is draft suggest with valid node citations", () => {
    const graph = createShowcaseGraphSnapshot();
    graph.nodes.push(showcaseIngestNodeFromGraph());
    const { actions } = generateProjectSuggestions({
      graph,
      trendItems: RADAR_FIXTURE_WORLD_ITEMS,
    });
    const nodeIds = new Set(graph.nodes.filter((n) => !n.archived).map((n) => n.id));
    for (const action of actions) {
      expect(action.status).toBe("draft");
      expect(action.permissionLevel).toBe("suggest");
      expect(action.metadata).toBeDefined();
      if (!isProjectSuggestionMetadata(action.metadata!)) {
        throw new Error("expected project suggestion metadata");
      }
      expect(action.metadata.linkedNodeIds.length).toBeGreaterThanOrEqual(1);
      const metadata = parseMetadataFromAction(action);
      expect(metadata).not.toBeNull();
      expect(metadata!.linkedNodeIds.length).toBeGreaterThanOrEqual(1);
      for (const id of metadata!.linkedNodeIds) {
        expect(nodeIds.has(id)).toBe(true);
      }
      for (const citation of action.citations) {
        expect(citation.type).toBe("node");
        expect(nodeIds.has(citation.id)).toBe(true);
      }
    }
  });

  it("pa-1 references B3 trend fixture id or title", () => {
    const graph = createShowcaseGraphSnapshot();
    graph.nodes.push(showcaseIngestNodeFromGraph());
    const { actions } = generateProjectSuggestions({
      graph,
      trendItems: RADAR_FIXTURE_WORLD_ITEMS,
    });
    const pa1 = actions.find((row) => row.id === "pa-1");
    expect(pa1).toBeDefined();
    const metadata = parseMetadataFromAction(pa1!);
    const trendItem = RADAR_FIXTURE_WORLD_ITEMS.find(
      (item) => item.id === PROJECT_SUGGESTION_TREND_FIXTURE_ID,
    );
    expect(parseMetadataFromAction(pa1!)?.worldItemId).toBe(PROJECT_SUGGESTION_TREND_FIXTURE_ID);
    expect(metadata?.worldItemId).toBe(PROJECT_SUGGESTION_TREND_FIXTURE_ID);
    const blob = `${metadata?.reason} ${pa1!.bodyMarkdown}`;
    expect(
      blob.includes(PROJECT_SUGGESTION_TREND_FIXTURE_ID) ||
        blob.includes(trendItem?.title ?? ""),
    ).toBe(true);
  });

  it("returns empty actions when graph has no visible nodes", () => {
    const { actions, emptyReason } = generateProjectSuggestions({
      graph: { nodes: [], edges: [] },
      trendItems: RADAR_FIXTURE_WORLD_ITEMS,
    });
    expect(actions).toHaveLength(0);
    expect(emptyReason).toContain("图谱");
  });

  it("golden entries cover pa-1 and pa-2", () => {
    expect(PROJECT_SUGGESTIONS_GOLDEN.map((row) => row.id)).toEqual(["pa-1", "pa-2"]);
  });
});
