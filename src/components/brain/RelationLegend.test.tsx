/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RelationLegend } from "@/components/brain/RelationLegend";

describe("RelationLegend", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders six relation rows with Chinese labels", () => {
    render(createElement(RelationLegend));
    const legend = screen.getByTestId("relation-legend");
    expect(legend).toBeTruthy();
    expect(screen.getByText("因果关系")).toBeTruthy();
    expect(screen.getByText("相关关系")).toBeTruthy();
    expect(screen.getByText("影响关系")).toBeTruthy();
    expect(screen.getByText("包含关系")).toBeTruthy();
    expect(screen.getByText("时间关系")).toBeTruthy();
    expect(screen.getByText("情感连接")).toBeTruthy();
  });
});
