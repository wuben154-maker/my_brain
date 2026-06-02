/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MainSectionContent } from "@/components/layout/MainSectionContent";
import { useUiStore } from "@/stores/uiStore";

describe("MainSectionContent (N0 AppShell routing)", () => {
  beforeEach(() => {
    window.location.hash = "";
    useUiStore.setState({ activeSection: "graph" });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders graph partition when activeSection is graph", () => {
    render(createElement(MainSectionContent));
    expect(screen.getByTestId("section-graph")).toBeTruthy();
  });

  it("renders planned placeholder when activeSection is not graph", () => {
    useUiStore.setState({ activeSection: "explore" });
    render(createElement(MainSectionContent));
    expect(screen.getByTestId("section-placeholder-explore")).toBeTruthy();
    expect(screen.getByText("探索")).toBeTruthy();
    expect(screen.getByText("specs/N1-explore-feed.md")).toBeTruthy();
  });
});
