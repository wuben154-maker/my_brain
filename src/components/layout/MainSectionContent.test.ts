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

  it("renders explore feed when activeSection is explore", () => {
    useUiStore.setState({ activeSection: "explore" });
    render(createElement(MainSectionContent));
    expect(screen.getByTestId("section-explore")).toBeTruthy();
    expect(screen.getByTestId("explore-feed-empty")).toBeTruthy();
  });

  it("renders agent inbox section when activeSection is agent", () => {
    useUiStore.setState({ activeSection: "agent" });
    render(createElement(MainSectionContent));
    expect(screen.getByTestId("section-agent")).toBeTruthy();
    expect(screen.getByTestId("proposal-inbox-inline")).toBeTruthy();
  });
});
