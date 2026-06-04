/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from "vitest";
import { effectiveGraphViewMode } from "@/lib/graphViewMode";
import { useUiStore } from "@/stores/uiStore";

describe("effectiveGraphViewMode (G1)", () => {
  beforeEach(() => {
    useUiStore.setState({ graphViewMode: "2d", activeSection: "graph" });
    window.location.search = "";
  });

  it("forces 2d when visual=companion for pixel baseline", () => {
    window.location.search = "?visual=companion";
    expect(effectiveGraphViewMode("3d", "companion")).toBe("2d");
  });

  it("respects stored mode when not in visual snapshot", () => {
    expect(effectiveGraphViewMode("3d", null)).toBe("3d");
    expect(effectiveGraphViewMode("2d", null)).toBe("2d");
  });
});
