import { beforeEach, describe, expect, it } from "vitest";

import { nodeSourceUrl, type BrainGraphSnapshot, type GraphMutationProposal } from "@/domain/graph";

import {

  createTempStorage,

  readProposalStatusFromDb,

  STORAGE_BACKEND_KINDS,

  type StorageBackendKind,

} from "@/invariants/testStorage";

import {

  applyGraphMutation,

  persistGraphSnapshot,

} from "@/lib/graphMutations";

import type { ProposalEnvelope } from "@/agent/types";
import { toResearchTempId } from "@/agent/jobs/topicResearchJob";

import type { StorageProvider } from "@/storage/types";

import { useProposalStore } from "./proposalStore";



const baseSnapshot = (): BrainGraphSnapshot => ({

  nodes: [

    {

      id: "node-a",

      title: "大模型上下文窗口",

      intro: "旧简介",

      sourceUrl: null,

      archived: false,

      createdAt: "2026-01-01T00:00:00.000Z",

      updatedAt: "2026-01-01T00:00:00.000Z",

    },

    {

      id: "node-b",

      title: "过时概念",

      intro: "将被归档",

      sourceUrl: null,

      archived: false,

      createdAt: "2026-01-01T00:00:00.000Z",

      updatedAt: "2026-01-01T00:00:00.000Z",

    },

  ],

  edges: [

    {

      id: "edge-1",

      sourceId: "node-b",

      targetId: "node-a",

      relationType: "related",

    },

  ],

});



function envelopeFromProposal(

  proposal: GraphMutationProposal,

  overrides: Partial<ProposalEnvelope> = {},

): ProposalEnvelope {

  return {

    id: proposal.id,

    runId: "run-test",

    createdAt: "2026-06-01T00:00:00.000Z",

    source: "background_ingest",

    status: "pending",

    proposal,

    ...overrides,

  };

}



async function manualApplyPath(

  storage: StorageProvider,

  proposal: GraphMutationProposal,

): Promise<BrainGraphSnapshot> {

  const before = await storage.loadGraph();

  const after = applyGraphMutation(before, proposal);

  await persistGraphSnapshot(storage, before, after);

  return storage.loadGraphForDisplay();

}



async function seedGraph(storage: StorageProvider): Promise<void> {

  const snapshot = baseSnapshot();

  await persistGraphSnapshot(storage, { nodes: [], edges: [] }, snapshot);

}



function stableNodeKey(node: BrainGraphSnapshot["nodes"][number]): string {

  if (/^concept-.+-\d+$/.test(node.id)) {

    return `generated:${node.title}`;

  }

  return node.id;

}



function normalizeGraphForCompare(snapshot: BrainGraphSnapshot) {

  const idToKey = new Map(

    snapshot.nodes.map((node) => [node.id, stableNodeKey(node)]),

  );

  return {

    nodes: snapshot.nodes

      .map((node) => ({

        key: stableNodeKey(node),

        title: node.title,

        intro: node.intro,

        sourceUrl: nodeSourceUrl(node),

        archived: node.archived,

      }))

      .sort((a, b) => a.key.localeCompare(b.key)),

    edges: snapshot.edges

      .map((edge) => ({

        sourceKey: idToKey.get(edge.sourceId) ?? edge.sourceId,

        targetKey: idToKey.get(edge.targetId) ?? edge.targetId,

        relationType: edge.relationType,

      }))

      .sort((a, b) =>

        `${a.sourceKey}:${a.targetKey}:${a.relationType}`.localeCompare(

          `${b.sourceKey}:${b.targetKey}:${b.relationType}`,

        ),

      ),

  };

}



async function assertApproveMatchesManualPath(

  storage: StorageProvider,

  proposal: GraphMutationProposal,

  kind: StorageBackendKind,

): Promise<void> {

  const before = await storage.loadGraph();

  const expectedAfter = applyGraphMutation(before, proposal);



  await storage.saveProposal(envelopeFromProposal(proposal));

  await useProposalStore.getState().load(storage);

  await useProposalStore.getState().approve(storage, storage, proposal.id);



  const approvedGraph = await storage.loadGraphForDisplay();

  const normalizedExpected = normalizeGraphForCompare(expectedAfter);

  expect(normalizeGraphForCompare(approvedGraph)).toEqual(normalizedExpected);



  const { storage: manualStorage, cleanup } = createTempStorage(kind);

  try {

    await manualStorage.init();

    if (before.nodes.length > 0 || before.edges.length > 0) {

      await persistGraphSnapshot(manualStorage, { nodes: [], edges: [] }, before);

    }

    const manualGraph = await manualApplyPath(manualStorage, proposal);

    expect(normalizeGraphForCompare(manualGraph)).toEqual(normalizedExpected);

  } finally {

    cleanup();

  }

}



describe.each(STORAGE_BACKEND_KINDS)(

  "proposalStore (A2 inbox, %s)",

  (kind: StorageBackendKind) => {

    beforeEach(() => {

      useProposalStore.getState().reset();

    });



    it("load fills pending from storage", async () => {

      const { storage, cleanup } = createTempStorage(kind);

      try {

        await storage.init();

        const proposal: GraphMutationProposal = {

          id: "prop-load-1",

          kind: "create",

          summary: "新建 RAG",

          payload: {

            title: "RAG",

            intro: "检索增强生成",

            sourceUrl: "https://example.com/rag",

          },

        };

        await storage.saveProposal(envelopeFromProposal(proposal));



        await useProposalStore.getState().load(storage);

        expect(useProposalStore.getState().pending).toHaveLength(1);

        expect(useProposalStore.getState().pending[0]?.id).toBe("prop-load-1");

      } finally {

        cleanup();

      }

    });



    it("reject marks rejected and removes from pending", async () => {

      const { storage, cleanup } = createTempStorage(kind);

      try {

        await storage.init();

        const proposal: GraphMutationProposal = {

          id: "prop-reject-1",

          kind: "create",

          summary: "新建",

          payload: { title: "X", intro: "y", sourceUrl: null },

        };

        await storage.saveProposal(envelopeFromProposal(proposal));

        await useProposalStore.getState().load(storage);



        await useProposalStore.getState().reject(storage, "prop-reject-1");



        expect(useProposalStore.getState().pending).toHaveLength(0);

        expect(await storage.listPendingProposals()).toHaveLength(0);

      } finally {

        cleanup();

      }

    });



    it("approve create matches manual applyGraphMutation snapshot", async () => {

      const proposal: GraphMutationProposal = {

        id: "prop-create-match",

        kind: "create",

        summary: "新建 Agent Framework",

        payload: {

          title: "Agent Framework",

          intro: "智能体编排框架",

          sourceUrl: "https://github.com/example/agent",

        },

      };



      const { storage, cleanup } = createTempStorage(kind);

      try {

        await storage.init();

        await assertApproveMatchesManualPath(storage, proposal, kind);

        expect(await storage.listPendingProposals()).toHaveLength(0);

        expect(useProposalStore.getState().pending).toHaveLength(0);

      } finally {

        cleanup();

      }

    });



    it("approve merge matches manual applyGraphMutation snapshot", async () => {

      const proposal: GraphMutationProposal = {

        id: "prop-merge-match",

        kind: "merge",

        summary: "合并过时概念",

        payload: {

          sourceNodeId: "node-b",

          targetNodeId: "node-a",

          mergedIntro: "合并后的简介",

        },

      };



      const { storage, cleanup } = createTempStorage(kind);

      try {

        await storage.init();

        await seedGraph(storage);

        await assertApproveMatchesManualPath(storage, proposal, kind);

      } finally {

        cleanup();

      }

    });



    it("approve update matches manual applyGraphMutation snapshot", async () => {

      const proposal: GraphMutationProposal = {

        id: "prop-update-match",

        kind: "update",

        summary: "更新概念",

        payload: {

          nodeId: "node-a",

          title: "上下文窗口",

          intro: "更新后的简介",

          sourceUrl: "https://example.com/context",

        },

      };



      const { storage, cleanup } = createTempStorage(kind);

      try {

        await storage.init();

        await seedGraph(storage);

        await assertApproveMatchesManualPath(storage, proposal, kind);

      } finally {

        cleanup();

      }

    });



    it("approve attach matches manual applyGraphMutation snapshot", async () => {

      const proposal: GraphMutationProposal = {

        id: "prop-attach-match",

        kind: "attach",

        summary: "补充简介",

        payload: {

          nodeId: "node-a",

          introAppend: "\n\n补充段落",

          sourceUrl: "https://example.com/extra",

        },

      };



      const { storage, cleanup } = createTempStorage(kind);

      try {

        await storage.init();

        await seedGraph(storage);

        await assertApproveMatchesManualPath(storage, proposal, kind);

      } finally {

        cleanup();

      }

    });



    it("approve link matches manual applyGraphMutation snapshot", async () => {

      const proposal: GraphMutationProposal = {

        id: "prop-link-match",

        kind: "link",

        summary: "连边",

        payload: {

          sourceId: "node-a",

          targetId: "node-b",

          relationType: "depends_on",

        },

      };



      const { storage, cleanup } = createTempStorage(kind);

      try {

        await storage.init();

        await seedGraph(storage);

        await assertApproveMatchesManualPath(storage, proposal, kind);

      } finally {

        cleanup();

      }

    });



    it("approve archive matches manual applyGraphMutation snapshot", async () => {

      const proposal: GraphMutationProposal = {

        id: "prop-archive-match",

        kind: "archive",

        summary: "归档过时概念",

        payload: {

          nodeId: "node-b",

          migrateEdgesToNodeId: "node-a",

        },

      };



      const { storage, cleanup } = createTempStorage(kind);

      try {

        await storage.init();

        await seedGraph(storage);

        await assertApproveMatchesManualPath(storage, proposal, kind);

      } finally {

        cleanup();

      }

    });



    it("marks proposal expired when approve fails on missing target node", async () => {

      const { storage, cleanup } = createTempStorage(kind);

      try {

        await storage.init();

        const proposal: GraphMutationProposal = {

          id: "prop-fail-attach",

          kind: "attach",

          summary: "补充不存在节点",

          payload: {

            nodeId: "missing-node",

            introAppend: "补充内容",

          },

        };

        await storage.saveProposal(envelopeFromProposal(proposal));

        await useProposalStore.getState().load(storage);



        await expect(

          useProposalStore

            .getState()

            .approve(storage, storage, proposal.id),

        ).rejects.toThrow(/attach 目标节点不存在/);



        expect(await storage.listPendingProposals()).toHaveLength(0);

        expect(useProposalStore.getState().pending).toHaveLength(0);

      } finally {

        cleanup();

      }

    });



    it("rejects link approve before batch create (research temp ids)", async () => {
      const { storage, cleanup } = createTempStorage(kind);
      const batchRunId = "run-research-batch";
      const tempA = toResearchTempId("研究概念 A");
      const tempB = toResearchTempId("研究概念 B");

      try {
        await storage.init();

        const createA: GraphMutationProposal = {
          id: "prop-batch-create-a",
          kind: "create",
          summary: "新建 A",
          payload: { title: "研究概念 A", intro: "a", sourceUrl: null },
        };
        const link: GraphMutationProposal = {
          id: "prop-batch-link",
          kind: "link",
          summary: "关联 A→B",
          payload: {
            sourceId: tempA,
            targetId: tempB,
            relationType: "related",
          },
        };

        await storage.saveProposal(
          envelopeFromProposal(createA, { runId: batchRunId }),
        );
        await storage.saveProposal(
          envelopeFromProposal(link, { runId: batchRunId }),
        );
        await useProposalStore.getState().load(storage);

        await expect(
          useProposalStore
            .getState()
            .approve(storage, storage, link.id),
        ).rejects.toThrow(/请先确认同批次的「新建」提议/);

        const stillPending = await storage.listPendingProposals();
        expect(stillPending).toHaveLength(1);
        expect(stillPending[0]?.id).toBe(createA.id);
        expect(useProposalStore.getState().pending).toHaveLength(1);
      } finally {
        cleanup();
      }
    });

    it("approve research batch link after creates yields real node ids", async () => {
      const { storage, cleanup } = createTempStorage(kind);
      const batchRunId = "run-research-batch-ok";
      const tempA = toResearchTempId("研究概念 A");
      const tempB = toResearchTempId("研究概念 B");

      try {
        await storage.init();

        const createA: GraphMutationProposal = {
          id: "prop-ok-create-a",
          kind: "create",
          summary: "新建 A",
          payload: { title: "研究概念 A", intro: "a", sourceUrl: null },
        };
        const createB: GraphMutationProposal = {
          id: "prop-ok-create-b",
          kind: "create",
          summary: "新建 B",
          payload: { title: "研究概念 B", intro: "b", sourceUrl: null },
        };
        const link: GraphMutationProposal = {
          id: "prop-ok-link",
          kind: "link",
          summary: "关联 A→B",
          payload: {
            sourceId: tempA,
            targetId: tempB,
            relationType: "related",
          },
        };

        for (const proposal of [createA, createB, link]) {
          await storage.saveProposal(
            envelopeFromProposal(proposal, { runId: batchRunId }),
          );
        }
        await useProposalStore.getState().load(storage);

        await useProposalStore
          .getState()
          .approve(storage, storage, createA.id);
        await useProposalStore
          .getState()
          .approve(storage, storage, createB.id);
        await useProposalStore
          .getState()
          .approve(storage, storage, link.id);

        const graph = await storage.loadGraphForDisplay();
        expect(graph.edges).toHaveLength(1);
        const edge = graph.edges[0];
        expect(edge?.sourceId).not.toMatch(/^__research_temp:/);
        expect(edge?.targetId).not.toMatch(/^__research_temp:/);
        expect(graph.nodes.some((n) => n.id === edge?.sourceId)).toBe(true);
        expect(graph.nodes.some((n) => n.id === edge?.targetId)).toBe(true);
      } finally {
        cleanup();
      }
    });

    it("supports expired status placeholder for failed approvals", async () => {

      const { storage, dbPath, cleanup } = createTempStorage(kind);

      try {

        await storage.init();

        const proposal: GraphMutationProposal = {

          id: "prop-expired-row",

          kind: "update",

          summary: "更新不存在节点",

          payload: {

            nodeId: "ghost",

            title: "T",

            intro: "I",

            sourceUrl: null,

          },

        };

        await storage.saveProposal(envelopeFromProposal(proposal));



        await expect(

          useProposalStore

            .getState()

            .approve(storage, storage, proposal.id),

        ).rejects.toThrow(/update 目标节点不存在/);



        expect(readProposalStatusFromDb(dbPath, proposal.id)).toBe("expired");

      } finally {

        cleanup();

      }

    });

  },

);

