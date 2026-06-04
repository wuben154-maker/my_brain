import { useCallback, useEffect, useMemo, useRef } from "react";
import type { GraphMutationProposal } from "@/domain/graph";
import {
  applyGraphMutation,
  persistGraphSnapshot,
  primaryNodeIdFromProposal,
  visibleGraph,
} from "@/lib/graphMutations";
import { resolveLinkPendingCreate } from "@/lib/resolveProposalForApply";
import {
  prependGrounding,
  recallGroundingContext,
} from "@/lib/memoryGrounding";
import { syncDisplayGraph } from "@/lib/syncDisplayGraph";
import {
  isNewsSessionComplete,
  resolveCurrentNewsItem,
  useIngestStore,
} from "@/stores/ingestStore";
import { useAppStore } from "@/stores/appStore";
import { useGraphStore } from "@/stores/graphStore";
import { useProfileStore } from "@/stores/profileStore";

export function useNewsIngestSession() {
  const pendingCreateNodeIdRef = useRef<string | null>(null);
  /** True after at least one proposal was persisted for the active news item. */
  const hasAppliedForActiveNewsRef = useRef(false);
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

  const isActive = phase === "companion";
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
      const query = `${currentItem.title} ${currentItem.summary}`.trim();
      const grounding = await recallGroundingContext(providers.memory, query);
      const profile = useProfileStore.getState().profile;
      const summary = grounding
        ? await providers.llm.explainConcept(
            prependGrounding(
              `请用通俗中文讲解这条资讯：${currentItem.title}\n${currentItem.summary}`,
              grounding,
            ),
            profile,
          )
        : await providers.llm.summarizeNews(currentItem);
      store.setExplanation(summary);
      store.setPhase("awaiting_ingest");
    } catch (error) {
      store.setError(
        error instanceof Error ? error.message : "讲解生成失败",
      );
      store.setPhase("awaiting_ingest");
    }
  }, [currentItem, providers?.llm, providers?.memory]);

  const requestIngest = useCallback(async () => {
    if (!providers?.llm || !currentItem || !storage) {
      return;
    }
    const store = useIngestStore.getState();
    store.setError(null);
    store.setActiveNewsId(currentItem.id);
    pendingCreateNodeIdRef.current = null;
    hasAppliedForActiveNewsRef.current = false;
    try {
      const graph = visibleGraph(await storage.loadGraph());
      const query = `${currentItem.title} ${currentItem.summary}`.trim();
      const grounding = await recallGroundingContext(providers.memory, query);
      const payload = JSON.stringify({
        newsItem: currentItem,
        nodes: graph.nodes.map((node) => ({
          id: node.id,
          title: node.title,
          intro: node.intro,
        })),
      });
      const context = prependGrounding(payload, grounding);
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
  }, [currentItem, providers?.llm, providers?.memory, storage]);

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
    const current = store.pendingProposal;
    const newsId = store.activeNewsId;
    if (!current || !newsId) {
      return;
    }

    try {
      let proposal = current;
      if (pendingCreateNodeIdRef.current) {
        proposal = resolveLinkPendingCreate(
          proposal,
          pendingCreateNodeIdRef.current,
        );
      }
      const nodeId = await applyProposal(proposal);
      hasAppliedForActiveNewsRef.current = true;
      if (proposal.kind === "create" && nodeId) {
        pendingCreateNodeIdRef.current = nodeId;
      }

      if (nodeId) {
        useGraphStore.getState().setHighlights([nodeId], []);
      }

      const next = store.shiftPendingProposal();
      if (!next) {
        store.markIngested(newsId);
        store.setExplanation("");
        pendingCreateNodeIdRef.current = null;
        hasAppliedForActiveNewsRef.current = false;
        store.setCursor(store.cursor + 1);
      }
    } catch (error) {
      store.setError(
        error instanceof Error ? error.message : "图谱变更失败",
      );
    }
  }, [applyProposal]);

  const rejectProposal = useCallback(() => {
    const store = useIngestStore.getState();
    const newsId = store.activeNewsId;
    const hadApplied = hasAppliedForActiveNewsRef.current;
    pendingCreateNodeIdRef.current = null;
    hasAppliedForActiveNewsRef.current = false;
    store.clearPending();
    // Partial confirm then reject: keep applied graph ops but do not re-propose this item.
    if (hadApplied && newsId) {
      store.markIngested(newsId);
      store.setExplanation("");
      store.setCursor(store.cursor + 1);
    }
  }, []);

  const skipCurrent = useCallback(() => {
    if (!currentItem) {
      return;
    }
    const store = useIngestStore.getState();
    store.markSkipped(currentItem.id);
    store.setExplanation("");
    pendingCreateNodeIdRef.current = null;
    hasAppliedForActiveNewsRef.current = false;
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
