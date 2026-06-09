/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WritingResearchOverlay } from "@/components/actions/WritingResearchOverlay";
import { generateBlogDraft } from "@/cognitive/generateBlogDraft";
import { generateResearchFollowups } from "@/cognitive/generateResearchFollowups";
import { RADAR_FIXTURE_WORLD_ITEMS } from "@/radar/worldSources/fixtureWorldSource";
import {
  createShowcaseGraphSnapshot,
  showcaseIngestNodeFromGraph,
} from "@/showcase/showcaseFixtures";
import { useCognitiveActionStore } from "@/stores/cognitiveActionStore";
import { useGraphStore } from "@/stores/graphStore";
import { useWritingResearchStore } from "@/stores/writingResearchStore";

function fixtureActions() {
  const graph = createShowcaseGraphSnapshot();
  graph.nodes.push(showcaseIngestNodeFromGraph());
  const blog = generateBlogDraft({ graph }).action!;
  const research = generateResearchFollowups({
    graph,
    worldItems: RADAR_FIXTURE_WORLD_ITEMS,
  }).action!;
  return [blog, research];
}

describe("writingResearchOverlay", () => {
  const closeWritingResearch = vi.fn();
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    const actions = fixtureActions();
    useWritingResearchStore.setState({
      open: true,
      actions,
      openWritingResearch: vi.fn(),
      closeWritingResearch,
      clear: useWritingResearchStore.getState().clear,
    });
    const graph = createShowcaseGraphSnapshot();
    graph.nodes.push(showcaseIngestNodeFromGraph());
    useGraphStore.setState(graph);
    useCognitiveActionStore.getState().clear();
    closeWritingResearch.mockClear();
    writeText.mockClear();
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    });
  });

  afterEach(() => {
    cleanup();
    useWritingResearchStore.getState().clear();
    useCognitiveActionStore.getState().clear();
  });

  it("renders draft badges and markdown preview", () => {
    render(createElement(WritingResearchOverlay));
    expect(screen.getByTestId("writing-research-overlay")).toBeTruthy();
    expect(screen.getByTestId("writing-research-draft-badge-wr-blog-1")).toBeTruthy();
    expect(screen.getByTestId("writing-research-draft-badge-wr-research-1")).toBeTruthy();
    expect(screen.getByTestId("writing-research-preview-wr-blog-1")).toBeTruthy();
  });

  it("publish buttons are disabled placeholders", () => {
    render(createElement(WritingResearchOverlay));
    const publishBtn = screen.getByTestId(
      "writing-research-publish-wr-blog-1",
    ) as HTMLButtonElement;
    expect(publishBtn.disabled).toBe(true);
    expect(publishBtn.getAttribute("aria-disabled")).toBe("true");
    expect(publishBtn.textContent).toContain("未启用");
  });

  it("copy markdown does not confirm action or change status", async () => {
    const actions = fixtureActions();
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
    render(createElement(WritingResearchOverlay));
    fireEvent.click(screen.getByTestId("writing-research-copy-wr-blog-1"));
    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(actions[0]!.bodyMarkdown);
    });
    const stored = useCognitiveActionStore.getState().actions.find((row) => row.id === "wr-blog-1");
    expect(stored?.status).toBe("draft");
  });

  it("closes overlay without mutating graph node count", () => {
    const beforeCount = useGraphStore.getState().nodes.length;
    render(createElement(WritingResearchOverlay));
    fireEvent.click(screen.getByTestId("writing-research-close"));
    expect(closeWritingResearch).toHaveBeenCalled();
    expect(useGraphStore.getState().nodes.length).toBe(beforeCount);
  });

  it("does not render when closed", () => {
    useWritingResearchStore.setState({ open: false, actions: [] });
    render(createElement(WritingResearchOverlay));
    expect(screen.queryByTestId("writing-research-overlay")).toBeNull();
  });
});
