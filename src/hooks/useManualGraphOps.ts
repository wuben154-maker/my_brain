import { useCallback, useState } from "react";
import type { GraphMutationProposal } from "@/domain/graph";
import { canUseLegacyNonVoiceGraphCreate } from "@/lib/devOnlyGuards";
import {
  applyGraphMutation,
  persistGraphSnapshot,
  primaryNodeIdFromProposal,
} from "@/lib/graphMutations";
import { syncDisplayGraph } from "@/lib/syncDisplayGraph";
import { useAppStore } from "@/stores/appStore";
import { useGraphStore } from "@/stores/graphStore";
import { useManualGraphStore } from "@/stores/manualGraphStore";

export interface ManualNodeForm {
  title: string;
  intro: string;
  sourceUrl: string;
}

function normalizeSourceUrl(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function proposalId(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

export function useManualGraphOps() {
  const storage = useAppStore((state) => state.storage);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pendingProposal = useManualGraphStore((state) => state.pendingProposal);

  const applyProposal = useCallback(
    async (proposal: GraphMutationProposal) => {
      if (
        proposal.kind === "create" &&
        !canUseLegacyNonVoiceGraphCreate()
      ) {
        throw new Error(
          "生产环境仅支持语音「入」确认入库；手动新建概念节点已禁用",
        );
      }
      if (!storage) {
        throw new Error("本地存储未就绪");
      }
      const before = await storage.loadGraph();
      const after = applyGraphMutation(before, proposal);
      await persistGraphSnapshot(storage, before, after);
      await syncDisplayGraph(storage);
      return primaryNodeIdFromProposal(proposal, after);
    },
    [storage],
  );

  const proposeCreate = useCallback((form: ManualNodeForm) => {
    if (!canUseLegacyNonVoiceGraphCreate()) {
      setErrorMessage("生产环境仅支持语音「入」确认入库");
      return;
    }
    setErrorMessage(null);
    const title = form.title.trim();
    if (!title) {
      setErrorMessage("请填写概念标题");
      return;
    }
    useManualGraphStore.getState().setPendingProposals([
      {
        id: proposalId("manual-create"),
        kind: "create",
        summary: `手动新建概念「${title}」`,
        payload: {
          title,
          intro: form.intro.trim(),
          sourceUrl: normalizeSourceUrl(form.sourceUrl),
        },
      },
    ]);
  }, []);

  const proposeUpdate = useCallback((nodeId: string, form: ManualNodeForm) => {
    setErrorMessage(null);
    const title = form.title.trim();
    if (!title) {
      setErrorMessage("请填写概念标题");
      return;
    }
    useManualGraphStore.getState().setPendingProposals([
      {
        id: proposalId("manual-update"),
        kind: "update",
        summary: `手动更新概念「${title}」`,
        payload: {
          nodeId,
          title,
          intro: form.intro.trim(),
          sourceUrl: normalizeSourceUrl(form.sourceUrl),
        },
      },
    ]);
  }, []);

  const proposeArchive = useCallback(
    (nodeId: string, nodeTitle: string, migrateEdgesToNodeId?: string | null) => {
      setErrorMessage(null);
      const migrateTarget = migrateEdgesToNodeId?.trim();
      const summary = migrateTarget
        ? `归档「${nodeTitle}」并将关系边迁移至目标节点`
        : `归档概念「${nodeTitle}」（可恢复，非硬删除）`;
      useManualGraphStore.getState().setPendingProposals([
        {
          id: proposalId("manual-archive"),
          kind: "archive",
          summary,
          payload: {
            nodeId,
            migrateEdgesToNodeId: migrateTarget || null,
          },
        },
      ]);
    },
    [],
  );

  const confirmProposals = useCallback(async () => {
    const store = useManualGraphStore.getState();
    const current = store.pendingProposal;
    if (!current) {
      return;
    }
    setIsApplying(true);
    setErrorMessage(null);
    try {
      const nodeId = await applyProposal(current);
      if (nodeId) {
        useGraphStore.getState().setHighlights([nodeId], []);
      }

      const next = store.shiftPendingProposal();
      if (!next) {
        if (current.kind === "archive") {
          useGraphStore.getState().selectNode(null);
        } else if (nodeId) {
          useGraphStore.getState().selectNode(nodeId);
        }
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "手动图谱变更失败",
      );
    } finally {
      setIsApplying(false);
    }
  }, [applyProposal]);

  const rejectProposals = useCallback(() => {
    useManualGraphStore.getState().clearPending();
  }, []);

  return {
    pendingProposal,
    isApplying,
    errorMessage,
    proposeCreate,
    proposeUpdate,
    proposeArchive,
    confirmProposals,
    rejectProposals,
  };
}
