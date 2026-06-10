/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyIngestCreate } from "@/conversation/ingestActions";
import { createTempStorage } from "@/invariants/testStorage";
import { visibleGraph } from "@/lib/graphMutations";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { useIngestStore } from "@/stores/ingestStore";
import {
  PROVENANCE_GRAPH_GOLDEN,
  SHOWCASE_BRIEFING_ITEMS,
  SHOWCASE_DESIGNATED_INGEST_BRIEF_ID,
  SHOWCASE_GRAPH_SNAPSHOT,
  SHOWCASE_INGEST_CANDIDATE,
  SHOWCASE_NOW,
} from "@/showcase/showcaseFixtures";
import { isConceptNode, isProjectNode, nodeSourceRefs } from "@/domain/graph";
import { setGraphMutationClockForTests } from "@/lib/graphMutations";

describe("provenanceIngest integration", () => {
  beforeEach(() => {
    useIngestStore.getState().reset();
    window.location.search = "?showcase=1";
    process.env.VITE_SHOWCASE_DEMO = "1";
    setGraphMutationClockForTests(() => SHOWCASE_NOW);
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
    delete process.env.VITE_SHOWCASE_DEMO;
    setGraphMutationClockForTests(null);
    vi.useRealTimers();
  });

  it("showcase ingest attaches PROVENANCE_GRAPH_GOLDEN sourceRefs", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      for (const node of SHOWCASE_GRAPH_SNAPSHOT.nodes) {
        if (isConceptNode(node)) {
          await storage.saveConcept(node);
        } else if (isProjectNode(node)) {
          await storage.saveProject(node);
        }
      }

      const brief = SHOWCASE_BRIEFING_ITEMS.find(
        (item) => item.id === SHOWCASE_DESIGNATED_INGEST_BRIEF_ID,
      );
      expect(brief).toBeDefined();

      useIngestStore.getState().setExplanation(SHOWCASE_INGEST_CANDIDATE.intro);
      const { nodeId } = await applyIngestCreate(brief!, {
        storage,
        llm: createMockLlmProvider(),
        profile: DEFAULT_USER_PROFILE,
      });

      expect(nodeId).toBe(PROVENANCE_GRAPH_GOLDEN.id);

      const graph = visibleGraph(await storage.loadGraph());
      const ingested = graph.nodes.find((node) => node.id === nodeId);
      expect(ingested).toBeDefined();
      if (ingested && isConceptNode(ingested)) {
        expect(ingested.sourceRefs).toEqual(PROVENANCE_GRAPH_GOLDEN.sourceRefs);
        expect(ingested.updatedAt).toBe(PROVENANCE_GRAPH_GOLDEN.updatedAt);
        expect(ingested.intro).not.toBe(brief!.title);
        expect(ingested.intro).not.toBe(brief!.summary);
      }
    } finally {
      cleanup();
    }
  });

  it("does not silently attach worldItemId to pre-existing demo nodes", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      for (const node of SHOWCASE_GRAPH_SNAPSHOT.nodes) {
        if (isConceptNode(node)) {
          await storage.saveConcept(node);
        } else if (isProjectNode(node)) {
          await storage.saveProject(node);
        }
      }

      const before = await storage.loadGraphForDisplay();
      for (const node of before.nodes) {
        expect(
          nodeSourceRefs(node).every((ref) => ref.worldItemId === undefined),
        ).toBe(true);
      }
    } finally {
      cleanup();
    }
  });
});
