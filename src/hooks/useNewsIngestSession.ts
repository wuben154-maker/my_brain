import { useCallback, useEffect, useMemo } from "react";
import type { GraphMutationProposal } from "@/domain/graph";
import {
  applyGraphMutation,
  persistGraphSnapshot,
  primaryNodeIdFromProposal,
  visibleGraph,
} from "@/lib/graphMutations";
import { syncDisplayGraph } from "@/lib/syncDisplayGraph";
import {
  isNewsSessionComplete,
  resolveCurrentNewsItem,
  useIngestStore,
} from "@/stores/ingestStore";
import { useAppStore } from "@/stores/appStore";
import { useGraphStore } from "@/stores/graphStore";

function resolveLinkTarget(
  proposal: GraphMutationProposal,
  createdNodeId: string,
): GraphMutationProposal {
  if (
    proposal.kind === "link" &&
    proposal.payload.targetId === "__PENDING_CREATE__"
  ) {
    return {
      ...proposal,
      payload: {
        ...proposal.payload,
        targetId: createdNodeId,
      },
    };
  }
  return proposal;
}

export function useNewsIngestSession() {
  const providers = useAppStore((state) => state.providers);
  const storage = useAppStore((state) => state.storage);
  const phase = useAppStore((state) => state.phase);
  const newsQueue = useAppStore((state) => state.newsQueue);

  const cursor = useIngestStore((state) => state.cursor);
  const ingestPhase = useIngestStore((state) => state.phase);
  const explanation = useIngestStore((state) => state.explanation);
  const pendingProposal = useIngestStore((state) => state.pendingProposal);
  const skippedIds = useIngestStore((state) => state.skippedIds);
  const ingestedIds = useIngestStore((state) => state.ingestedIds);
  const errorMessage = useIngestStore((state) => state.errorMessage);

  const isActive = phase === "ready" || phase === "onboarding";
  const currentItem = useMemo(
    () => resolveCurrentNewsItem(newsQueue, cursor, skippedIds, ingestedIds),
    [cursor, ingestedIds, newsQueue, skippedIds],
  );
  const sessionComplete = useMemo(
    () => isNewsSessionComplete(newsQueue, skippedIds, ingestedIds),
    [ingestedIds, newsQueue, skippedIds],
  );

  useEffect(() => {
    if (isActive && newsQueue.length > 0 && ingestPhase === "idle") {
      useIngestStore.getState().setPhase("awaiting_ingest");
    }
  }, [ingestPhase, isActive, newsQueue.length]);

  const explainCurrent = useCallback(async () => {
    if (!providers?.llm || !currentItem) {
      return;
    }
    const store = useIngestStore.getState();
    store.setError(null);
    store.setActiveNewsId(currentItem.id);
    store.setPhase("explaining");
    try {
      const summary = await providers.llm.summarizeNews(currentItem);
      store.setExplanation(summary);
      store.setPhase("awaiting_ingest");
    } catch (error) {
      store.setError(
        error instanceof Error ? error.message : "讲解生成失败",
      );
      store.setPhase("awaiting_ingest");
    }
  }, [currentItem, providers?.llm]);

  const requestIngest = useCallback(async () => {
    if (!providers?.llm || !currentItem || !storage) {
      return;
    }
    const store = useIngestStore.getState();
    store.setError(null);
    store.setActiveNewsId(currentItem.id);
    try {
      const graph = visibleGraph(await storage.loadGraph());
      const context = JSON.stringify({
        newsItem: currentItem,
        nodes: graph.nodes.map((node) => ({
          id: node.id,
          title: node.title,
          intro: node.intro,
        })),
      });
      const proposals = await providers.llm.proposeGraphMutations(context);
      if (proposals.length === 0) {
        store.setError("Mock LLM 未生成入库建议");
        return;
      }
      store.setPendingProposals(proposals);
    } catch (error) {
      store.setError(
        error instanceof Error ? error.message : "生成入库建议失败",
      );
    }
  }, [currentItem, providers?.llm, storage]);

  const applyProposal = useCallback(
    async (proposal: GraphMutationProposal) => {
      if (!storage) {
        return null;
      }
      const before = await storage.loadGraph();
      const after = applyGraphMutation(before, proposal);
      await persistGraphSnapshot(storage, before, after);
      await syncDisplayGraph(storage);
      return primaryNodeIdFromProposal(proposal, after);
    },
    [storage],
  );

  const confirmProposal = useCallback(async () => {
    const store = useIngestStore.getState();
    const proposals = [...store.pendingProposalQueue];
    const newsId = store.activeNewsId;
    if (proposals.length === 0 || !newsId) {
      return;
    }

    try {
      let createdNodeId: string | null = null;
      for (const original of proposals) {
        let proposal = original;
        if (createdNodeId) {
          proposal = resolveLinkTarget(proposal, createdNodeId);
        }
        const nodeId = await applyProposal(proposal);
        if (proposal.kind === "create" && nodeId) {
          createdNodeId = nodeId;
        }
      }

      if (createdNodeId) {
        useGraphStore.getState().setHighlights([createdNodeId], []);
      }

      store.markIngested(newsId);
      store.clearPending();
      store.setExplanation("");
      store.setCursor(store.cursor + 1);
    } catch (error) {
      store.setError(
        error instanceof Error ? error.message : "图谱变更失败",
      );
    }
  }, [applyProposal]);

  const rejectProposal = useCallback(() => {
    useIngestStore.getState().clearPending();
  }, []);

  const skipCurrent = useCallback(() => {
    if (!currentItem) {
      return;
    }
    const store = useIngestStore.getState();
    store.markSkipped(currentItem.id);
    store.setExplanation("");
    store.clearPending();
    store.setCursor(store.cursor + 1);
  }, [currentItem]);

  const declineIngest = useCallback(() => {
    skipCurrent();
  }, [skipCurrent]);

  return {
    currentItem,
    ingestPhase,
    explanation,
    pendingProposal,
    errorMessage,
    sessionComplete,
    isActive,
    explainCurrent,
    requestIngest,
    confirmProposal,
    rejectProposal,
    skipCurrent,
    declineIngest,
    processedCount: skippedIds.length + ingestedIds.length,
    totalCount: newsQueue.length,
  };
}
