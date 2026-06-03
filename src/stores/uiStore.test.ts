import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { readRepoSource } from "@/invariants/readRepoSource";
import { NAV_SECTIONS } from "@/lib/navSections";
import { useUiStore } from "@/stores/uiStore";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @vitest-environment happy-dom
 */
describe("uiStore (N0 navigation)", () => {
  beforeEach(() => {
    useUiStore.setState({ activeSection: "graph", graphViewMode: "2d" });
    window.location.hash = "";
  });

  it("defaults to graph section", () => {
    expect(useUiStore.getState().activeSection).toBe("graph");
  });

  it("defaults graphViewMode to 2d (G1)", () => {
    expect(useUiStore.getState().graphViewMode).toBe("2d");
  });

  it("setGraphViewMode toggles 2d and 3d (G1)", () => {
    useUiStore.getState().setGraphViewMode("3d");
    expect(useUiStore.getState().graphViewMode).toBe("3d");
    useUiStore.getState().setGraphViewMode("2d");
    expect(useUiStore.getState().graphViewMode).toBe("2d");
  });

  it("setSection updates activeSection", () => {
    useUiStore.getState().setSection("explore");
    expect(useUiStore.getState().activeSection).toBe("explore");
  });

  it("setSection writes location hash for non-graph sections", () => {
    useUiStore.getState().setSection("agent");
    expect(window.location.hash).toBe("#agent");
  });

  it("syncFromHash reads hash into store", () => {
    window.location.hash = "#settings";
    useUiStore.getState().syncFromHash();
    expect(useUiStore.getState().activeSection).toBe("settings");
  });
});

describe("navSections (N0 invariants)", () => {
  it("NavRail renders every NAV_SECTIONS id", () => {
    const navRail = readRepoSource("src/components/layout/NavRail.tsx");
    expect(navRail).toContain("NAV_SECTIONS.map");
    for (const section of NAV_SECTIONS) {
      expect(navRail).toContain(`NAV_ICONS[item.id]`);
      expect(NAV_SECTIONS.some((entry) => entry.id === section.id)).toBe(true);
    }
    expect(NAV_SECTIONS).toHaveLength(7);
  });

  it("planned sections point at existing spec files; live sections need no specRef", () => {
    const planned = NAV_SECTIONS.filter((section) => section.status === "planned");
    for (const section of planned) {
      expect(section.specRef).toMatch(/^specs\/.+\.md$/);
      expect(
        existsSync(join(REPO_ROOT, section.specRef!)),
        `${section.specRef} must exist`,
      ).toBe(true);
    }
    expect(NAV_SECTIONS.find((s) => s.id === "agent")?.status).toBe("live");
    expect(NAV_SECTIONS.find((s) => s.id === "explore")?.status).toBe("live");
    expect(NAV_SECTIONS.find((s) => s.id === "mindmap")?.status).toBe("live");
  });
});
