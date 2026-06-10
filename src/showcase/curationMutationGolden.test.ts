import { describe, expect, it, beforeEach } from "vitest";
import { isConceptNode, isProjectNode } from "@/domain/graph";
import { applyGraphMutation, persistGraphSnapshot } from "@/lib/graphMutations";
import { buildGraphHistoryEntry } from "@/lib/graphHistoryMeta";
import { createTempStorage } from "@/invariants/testStorage";
import {
  CURATION_FIXTURE_GRAPH,
  CURATION_MUTATION_GOLDEN,
  createCurationFixtureSnapshot,
  toCurationGoldenProposal,
} from "@/showcase/curationFixtureGraph";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";

function edgeSet(snapshot: { edges: Array<{ sourceId: string; targetId: string; relationType: string }> }) {
  return snapshot.edges
    .map((edge) => `${edge.sourceId}->${edge.targetId}:${edge.relationType}`)
    .sort();
}

async function seedFixtureGraph(
  storage: Awaited<ReturnType<typeof createTempStorage>>["storage"],
) {
  const snapshot = createCurationFixtureSnapshot();
  for (const node of snapshot.nodes) {
    if (isConceptNode(node)) {
      await storage.saveConcept(node);
    } else if (isProjectNode(node)) {
      await storage.saveProject(node);
    }
  }
  for (const edge of snapshot.edges) {
    await storage.saveEdge(edge);
  }
  return snapshot;
}

describe("curationMutationGolden", () => {
  beforeEach(() => {
    useGraphHistoryStore.getState().clear();
  });

  it("fixture graph includes duplicate RAG node and agent edge", () => {
    expect(CURATION_FIXTURE_GRAPH.nodes.some((node) => node.id === "demo-rag-dup")).toBe(
      true,
    );
    expect(
      CURATION_FIXTURE_GRAPH.edges.some(
        (edge) =>
          edge.sourceId === "demo-agent" && edge.targetId === "demo-rag-dup",
      ),
    ).toBe(true);
  });

  it("applies three golden mutations with non-empty reasonDetail and records history", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      let working = await seedFixtureGraph(storage);
      const recorded = [];

      for (const golden of CURATION_MUTATION_GOLDEN) {
        const proposal = toCurationGoldenProposal(golden);
        const before = working;
        const after = applyGraphMutation(before, proposal);
        await persistGraphSnapshot(storage, before, after);
        const entry = buildGraphHistoryEntry(proposal, before, after, golden.id);
        await useGraphHistoryStore.getState().record(storage, entry);
        recorded.push(entry);
        working = after;
      }

      expect(recorded).toHaveLength(3);
      expect(recorded.every((entry) => entry.reasonDetail.trim().length > 0)).toBe(
        true,
      );
      expect(recorded.map((entry) => entry.reasonCode)).toEqual([
        "ingest_link",
        "duplicate_merge",
        "stale_archive",
      ]);

      const mergeEntry = recorded[1]!;
      expect(mergeEntry.edgeMigrations!.length).toBeGreaterThanOrEqual(1);
      expect(mergeEntry.affectedNodeIds).toContain("demo-rag-dup");
      expect(mergeEntry.affectedNodeIds).toContain("demo-rag");

      expect(useGraphHistoryStore.getState().entries).toHaveLength(3);
    } finally {
      cleanup();
    }
  });

  it("undo each golden entry restores cumulative before snapshots", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      let working = await seedFixtureGraph(storage);
      const entries = [];

      for (const golden of CURATION_MUTATION_GOLDEN) {
        const proposal = toCurationGoldenProposal(golden);
        const before = working;
        const after = applyGraphMutation(before, proposal);
        await persistGraphSnapshot(storage, before, after);
        const entry = buildGraphHistoryEntry(proposal, before, after, golden.id);
        await useGraphHistoryStore.getState().record(storage, entry);
        entries.unshift(entry);
        working = after;
      }

      for (const entry of entries) {
        const beforeUndo = await storage.loadGraphForDisplay();
        await useGraphHistoryStore.getState().undo(storage, entry.id);
        const restored = await storage.loadGraphForDisplay();
        expect(edgeSet(restored)).toEqual(edgeSet(entry.before));
        expect(restored.nodes.find((node) => node.id === "demo-rag-dup")?.archived).toBe(
          entry.before.nodes.find((node) => node.id === "demo-rag-dup")?.archived ?? false,
        );
        const staleBefore = entry.before.nodes.find(
          (node) => node.id === "demo-stale-concept",
        );
        const staleAfter = restored.nodes.find((node) => node.id === "demo-stale-concept");
        if (staleBefore) {
          expect(staleAfter?.archived).toBe(staleBefore.archived);
        }
        expect(beforeUndo.nodes.length).toBeGreaterThanOrEqual(restored.nodes.length);
      }
    } finally {
      cleanup();
    }
  });

  it("merge undo restores before edge set and unarchives dup node", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      let working = await seedFixtureGraph(storage);

      const linkProposal = toCurationGoldenProposal(CURATION_MUTATION_GOLDEN[0]!);
      working = applyGraphMutation(working, linkProposal);
      await persistGraphSnapshot(storage, CURATION_FIXTURE_GRAPH, working);

      const beforeMerge = structuredClone(working);
      const mergeProposal = toCurationGoldenProposal(CURATION_MUTATION_GOLDEN[1]!);
      const afterMerge = applyGraphMutation(beforeMerge, mergeProposal);
      await persistGraphSnapshot(storage, beforeMerge, afterMerge);
      const mergeEntry = buildGraphHistoryEntry(
        mergeProposal,
        beforeMerge,
        afterMerge,
        mergeProposal.id,
      );
      await useGraphHistoryStore.getState().record(storage, mergeEntry);

      expect(mergeEntry.edgeMigrations!.length).toBeGreaterThanOrEqual(1);

      await useGraphHistoryStore.getState().undo(storage, mergeEntry.id);
      const restored = await storage.loadGraphForDisplay();

      expect(edgeSet(restored)).toEqual(edgeSet(beforeMerge));
      expect(restored.nodes.find((node) => node.id === "demo-rag-dup")?.archived).toBe(
        false,
      );
      expect(
        restored.edges.some(
          (edge) =>
            edge.sourceId === "demo-agent" && edge.targetId === "demo-rag-dup",
        ),
      ).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("archive undo sets archived=false without deleting node", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      let working = await seedFixtureGraph(storage);

      for (const golden of CURATION_MUTATION_GOLDEN) {
        const proposal = toCurationGoldenProposal(golden);
        const before = working;
        const after = applyGraphMutation(before, proposal);
        await persistGraphSnapshot(storage, before, after);
        const entry = buildGraphHistoryEntry(proposal, before, after, golden.id);
        await useGraphHistoryStore.getState().record(storage, entry);
        working = after;
      }

      const archiveEntry = useGraphHistoryStore
        .getState()
        .entries.find((row) => row.kind === "archive")!;

      await useGraphHistoryStore.getState().undo(storage, archiveEntry.id);
      const full = await storage.loadGraph();

      expect(full.nodes.some((node) => node.id === "demo-stale-concept")).toBe(true);
      expect(
        full.nodes.find((node) => node.id === "demo-stale-concept")?.archived,
      ).toBe(false);
    } finally {
      cleanup();
    }
  });
});
