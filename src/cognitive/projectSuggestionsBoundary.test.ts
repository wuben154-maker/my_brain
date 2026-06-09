import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { runGenerateProjectSuggestions } from "@/actions/runGenerateProjectSuggestions";
import { ActionDraftGuardError } from "@/actions/actionDraftGuard";
import { containsBannedSuggestionPhrase } from "@/domain/actions/projectSuggestionMetadata";
import {
  generateProjectSuggestions,
  projectSuggestionsMatchGolden,
} from "@/cognitive/generateProjectSuggestions";
import {
  BRAIN_WRITE_TOOL_BLOCKLIST,
  listReadonlyTools,
} from "@/mcp/brainReadonlyHandlers";
import { readRepoSource } from "@/invariants/readRepoSource";
import { RADAR_FIXTURE_WORLD_ITEMS } from "@/radar/worldSources/fixtureWorldSource";
import {
  createShowcaseGraphSnapshot,
  showcaseIngestNodeFromGraph,
} from "@/showcase/showcaseFixtures";
import { useCognitiveActionStore } from "@/stores/cognitiveActionStore";
import { useProjectSuggestionsStore } from "@/stores/projectSuggestionsStore";

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

describe("projectSuggestionsBoundary", () => {
  let fetchSpy: MockInstance<FetchFn>;
  let githubCallCount: number;

  beforeEach(() => {
    githubCallCount = 0;
    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("github.com") || url.includes("api.github")) {
        githubCallCount += 1;
      }
      return Promise.reject(new Error("network blocked in boundary test"));
    });
    useCognitiveActionStore.getState().clear();
    useProjectSuggestionsStore.getState().clear();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    useCognitiveActionStore.getState().clear();
    useProjectSuggestionsStore.getState().clear();
  });

  it("generate and store makes zero GitHub network calls", async () => {
    const graph = createShowcaseGraphSnapshot();
    graph.nodes.push(showcaseIngestNodeFromGraph());
    const before = structuredClone(graph);

    await runGenerateProjectSuggestions({
      graph,
      trendItems: RADAR_FIXTURE_WORLD_ITEMS,
      storage: null,
      openOverlay: true,
    });

    expect(githubCallCount).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(graph).toEqual(before);
    expect(useCognitiveActionStore.getState().listDrafts()).toHaveLength(2);
    expect(projectSuggestionsMatchGolden(useCognitiveActionStore.getState().listDrafts())).toBe(
      true,
    );
  });

  it("confirmAction without user event stays blocked and makes zero GitHub calls", async () => {
    const graph = createShowcaseGraphSnapshot();
    graph.nodes.push(showcaseIngestNodeFromGraph());
    const { actions } = generateProjectSuggestions({
      graph,
      trendItems: RADAR_FIXTURE_WORLD_ITEMS,
    });
    for (const action of actions) {
      await useCognitiveActionStore.getState().createAndStore(null, {
        id: action.id,
        kind: action.kind,
        title: action.title,
        bodyMarkdown: action.bodyMarkdown,
        citations: action.citations,
        metadata: action.metadata,
        createdAt: action.createdAt,
      });
    }

    await expect(
      useCognitiveActionStore.getState().confirmAction(null, "pa-1", undefined),
    ).rejects.toThrow(ActionDraftGuardError);

    expect(githubCallCount).toBe(0);
    const row = useCognitiveActionStore
      .getState()
      .actions.find((action) => action.id === "pa-1");
    expect(row?.status).toBe("draft");
  });

  it("generated copy contains no banned vague phrases", () => {
    const graph = createShowcaseGraphSnapshot();
    graph.nodes.push(showcaseIngestNodeFromGraph());
    const { actions } = generateProjectSuggestions({
      graph,
      trendItems: RADAR_FIXTURE_WORLD_ITEMS,
    });
    for (const action of actions) {
      const hit = containsBannedSuggestionPhrase(action.bodyMarkdown);
      expect(hit).toBeNull();
    }
  });

  it("MCP readonly surface has no issue create or cognitive action write tools", () => {
    const tools = listReadonlyTools();
    const blocked = [
      ...BRAIN_WRITE_TOOL_BLOCKLIST,
      "github_create_issue",
      "create_issue",
      "issue_create",
      "gh_issue_create",
    ];
    for (const name of blocked) {
      expect(tools).not.toContain(name);
    }
    const handlerSource = readRepoSource("src/mcp/brainReadonlyHandlers.ts");
    expect(handlerSource.toLowerCase()).not.toContain("create_issue");
    expect(handlerSource).not.toContain("github_create_issue");
  });

  it("MemoryProvider sources do not write project suggestions", () => {
    const memorySources = [
      "src/providers/memory/mockMemoryProvider.ts",
      "src/providers/memory/everMemOsProvider.ts",
      "src/providers/memory/types.ts",
    ];
    for (const relativePath of memorySources) {
      const source = readRepoSource(relativePath);
      expect(source).not.toContain("generateProjectSuggestions");
      expect(source).not.toContain("ProjectSuggestionsOverlay");
      expect(source).not.toContain("runGenerateProjectSuggestions");
    }
  });
});
