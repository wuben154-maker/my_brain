/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectSuggestionsOverlay } from "@/components/actions/ProjectSuggestionsOverlay";
import { generateProjectSuggestions } from "@/cognitive/generateProjectSuggestions";
import { RADAR_FIXTURE_WORLD_ITEMS } from "@/radar/worldSources/fixtureWorldSource";
import {
  createShowcaseGraphSnapshot,
  showcaseIngestNodeFromGraph,
} from "@/showcase/showcaseFixtures";
import { useGraphStore } from "@/stores/graphStore";
import { useProjectSuggestionsStore } from "@/stores/projectSuggestionsStore";

function fixtureActions() {
  const graph = createShowcaseGraphSnapshot();
  graph.nodes.push(showcaseIngestNodeFromGraph());
  return generateProjectSuggestions({
    graph,
    trendItems: RADAR_FIXTURE_WORLD_ITEMS,
  }).actions;
}

describe("projectSuggestionsOverlay", () => {
  const closeSuggestions = vi.fn();
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    const actions = fixtureActions();
    useProjectSuggestionsStore.setState({
      open: true,
      actions,
      openSuggestions: vi.fn(),
      closeSuggestions,
      clear: useProjectSuggestionsStore.getState().clear,
    });
    useGraphStore.setState(createShowcaseGraphSnapshot());
    const graph = createShowcaseGraphSnapshot();
    graph.nodes.push(showcaseIngestNodeFromGraph());
    useGraphStore.setState(graph);
    closeSuggestions.mockClear();
    writeText.mockClear();
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    });
  });

  afterEach(() => {
    cleanup();
    useProjectSuggestionsStore.getState().clear();
  });

  it("renders draft badges, linked node chips, and structured fields", () => {
    render(createElement(ProjectSuggestionsOverlay));
    expect(screen.getByTestId("project-suggestions-overlay")).toBeTruthy();
    expect(screen.getByTestId("project-suggestion-draft-badge-pa-1")).toBeTruthy();
    expect(screen.getByTestId("project-suggestion-draft-badge-pa-2")).toBeTruthy();
    expect(
      screen.getByTestId("project-suggestion-node-chip-pa-1-demo-agent"),
    ).toBeTruthy();
    expect(screen.getByTestId("project-suggestion-reason-pa-1")).toBeTruthy();
    expect(screen.getByTestId("project-suggestion-impact-pa-1")).toBeTruthy();
    expect(screen.getByTestId("project-suggestion-next-pa-1")).toBeTruthy();
  });

  it("GitHub submit buttons are disabled placeholders", () => {
    render(createElement(ProjectSuggestionsOverlay));
    const githubBtn = screen.getByTestId(
      "project-suggestion-github-submit-pa-1",
    ) as HTMLButtonElement;
    expect(githubBtn.disabled).toBe(true);
    expect(githubBtn.getAttribute("aria-disabled")).toBe("true");
    expect(githubBtn.textContent).toContain("未启用");
  });

  it("copies markdown draft without metadata comment", async () => {
    const actions = fixtureActions();
    render(createElement(ProjectSuggestionsOverlay));
    fireEvent.click(screen.getByTestId("project-suggestion-copy-pa-1"));
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(actions[0]!.bodyMarkdown);
    });
  });

  it("closes overlay without mutating graph node count", () => {
    const beforeCount = useGraphStore.getState().nodes.length;
    render(createElement(ProjectSuggestionsOverlay));
    fireEvent.click(screen.getByTestId("project-suggestions-close"));
    expect(closeSuggestions).toHaveBeenCalled();
    expect(useGraphStore.getState().nodes.length).toBe(beforeCount);
  });

  it("does not render when closed", () => {
    useProjectSuggestionsStore.setState({ open: false, actions: [] });
    render(createElement(ProjectSuggestionsOverlay));
    expect(screen.queryByTestId("project-suggestions-overlay")).toBeNull();
  });
});
