/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it } from "vitest";
import { createTempStorage } from "@/invariants/testStorage";
import {
  bootstrapShowcaseGraph,
  getShowcaseNewsQueue,
  isShowcaseDemoMode,
} from "@/showcase/showcaseDemoMode";
import {
  SHOWCASE_BRIEFING_ITEMS,
  SHOWCASE_GRAPH_SNAPSHOT,
} from "@/showcase/showcaseFixtures";
import { visibleGraph } from "@/lib/graphMutations";

describe("showcaseDemoMode", () => {
  afterEach(() => {
    window.history.replaceState({}, "", "/");
    delete process.env.VITE_SHOWCASE_DEMO;
  });

  it("enables via ?showcase=1 query flag", () => {
    window.location.search = "?showcase=1";
    expect(isShowcaseDemoMode()).toBe(true);
  });

  it("enables via VITE_SHOWCASE_DEMO=1 env flag", () => {
    window.location.search = "";
    process.env.VITE_SHOWCASE_DEMO = "1";
    expect(isShowcaseDemoMode()).toBe(true);
  });

  it("returns false when showcase flag is absent", () => {
    window.location.search = "";
    delete process.env.VITE_SHOWCASE_DEMO;
    expect(isShowcaseDemoMode()).toBe(false);
  });

  it("getShowcaseNewsQueue returns three fixed briefing ids", () => {
    const queue = getShowcaseNewsQueue();
    expect(queue).toHaveLength(3);
    expect(queue.map((item) => item.id)).toEqual(
      SHOWCASE_BRIEFING_ITEMS.map((item) => item.id),
    );
  });

  it("bootstrapShowcaseGraph seeds graph snapshot with six visible nodes", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      await bootstrapShowcaseGraph(storage);
      const active = await storage.loadGraph();
      expect(active.nodes).toHaveLength(6);
      expect(visibleGraph(active).nodes).toHaveLength(6);

      const full = await storage.loadGraphForDisplay();
      expect(full.nodes).toHaveLength(SHOWCASE_GRAPH_SNAPSHOT.nodes.length);
      const bert = full.nodes.find((n) => n.id === "demo-bert");
      expect(bert?.archived).toBe(true);
    } finally {
      cleanup();
    }
  });
});
