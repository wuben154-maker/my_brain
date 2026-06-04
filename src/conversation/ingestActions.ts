import type { GraphMutationProposal } from "@/domain/graph";
import { readCreatePayload } from "@/domain/graphMutationPayloads";
import type { NewsItem } from "@/domain/news";
import type { UserProfile } from "@/domain/profile";
import {
  applyGraphMutation,
  persistGraphSnapshot,
  primaryNodeIdFromProposal,
  visibleGraph,
} from "@/lib/graphMutations";
import {
  prependGrounding,
  recallGroundingContext,
} from "@/lib/memoryGrounding";
import { syncDisplayGraph } from "@/lib/syncDisplayGraph";
import type { LlmProvider } from "@/providers/llm/types";
import type { MemoryProvider } from "@/providers/memory/types";
import type { StorageProvider } from "@/storage/types";
import { useGraphStore } from "@/stores/graphStore";
import { useIngestStore } from "@/stores/ingestStore";
import type {
  ConversationEvent,
  IngestCommand,
  Turn,
} from "@/conversation/types";
export interface IngestDecisionDeps {
  storage: StorageProvider;
  llm: LlmProvider;
  profile: UserProfile;
  memory?: MemoryProvider | null;
}

export function buildCreateProposalFromNews(
  item: NewsItem,
  explanation: string,
  proposal: GraphMutationProposal,
): GraphMutationProposal {
  if (proposal.kind !== "create") {
    return proposal;
  }
  const payload = readCreatePayload(proposal.payload);
  const intro =
    explanation.trim().length > 0
      ? explanation.trim().slice(0, 2000)
      : payload.intro;
  return {
    ...proposal,
    payload: {
      ...payload,
      intro,
      sourceUrl: item.sourceUrl ?? payload.sourceUrl,
    },
  };
}

export async function persistProposalToGraph(
  storage: StorageProvider,
  proposal: GraphMutationProposal,
): Promise<string | null> {
  const before = await storage.loadGraph();
  const after = applyGraphMutation(before, proposal);
  await persistGraphSnapshot(storage, before, after);
  await syncDisplayGraph(storage);
  return primaryNodeIdFromProposal(proposal, after);
}

async function resolveCreateProposal(
  item: NewsItem,
  deps: IngestDecisionDeps,
): Promise<GraphMutationProposal | null> {
  const graph = visibleGraph(await deps.storage.loadGraph());
  const query = `${item.title} ${item.summary}`.trim();
  const grounding = deps.memory
    ? await recallGroundingContext(deps.memory, query)
    : "";
  const payload = JSON.stringify({
    newsItem: item,
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      title: node.title,
      intro: node.intro,
    })),
  });
  const context = prependGrounding(payload, grounding);
  const proposals = await deps.llm.proposeGraphMutations(context);
  const create =
    proposals.find((p) => p.kind === "create") ?? proposals[0] ?? null;
  return create;
}

/**
 * Voice-confirmed create path: propose → create mutation → persist → graph store.
 */
export async function applyIngestCreate(
  item: NewsItem,
  deps: IngestDecisionDeps,
): Promise<string | null> {
  const store = useIngestStore.getState();
  const explanation = store.explanation;
  const raw = await resolveCreateProposal(item, deps);
  if (!raw) {
    throw new Error("Mock LLM 未生成入库建议");
  }
  const proposal = buildCreateProposalFromNews(item, explanation, raw);
  const nodeId = await persistProposalToGraph(deps.storage, proposal);
  if (nodeId) {
    useGraphStore.getState().setHighlights([nodeId], []);
  }
  return nodeId;
}

export interface IngestDecisionResult {
  turn: Turn;
  event?: ConversationEvent;
}

/**
 * Side effects for resolved ingest commands (not reprompt — handled by session).
 */
export async function applyIngestDecision(
  command: IngestCommand,
  item: NewsItem,
  deps: IngestDecisionDeps,
): Promise<IngestDecisionResult> {
  const store = useIngestStore.getState();

  if (command === "elaborate") {
    store.bumpElaborationDepth();
    const depth = useIngestStore.getState().elaborationDepth;
    const query = `${item.title} ${item.summary}`.trim();
    const grounding = deps.memory
      ? await recallGroundingContext(deps.memory, query)
      : "";
    const topic = prependGrounding(item.title, grounding);
    let deeper = await deps.llm.explainConcept(topic, deps.profile);
    if (depth > 1) {
      deeper = `【深入 ${depth}】${deeper}`;
    }
    store.setExplanation(deeper);
    store.resetIngestParseAttempt();
    return {
      turn: { say: "" },
      event: { type: "ingestAnswer", command: "elaborate" },
    };
  }

  if (command === "skip") {
    store.markSkipped(item.id);
    store.setExplanation("");
    store.resetElaborationDepth();
    store.resetIngestParseAttempt();
    store.setCursor(Math.min(store.cursor + 1, Number.MAX_SAFE_INTEGER));
    return {
      turn: { say: "" },
      event: { type: "ingestAnswer", command: "skip" },
    };
  }

  await applyIngestCreate(item, deps);
  store.markIngested(item.id);
  store.setExplanation("");
  store.resetElaborationDepth();
  store.resetIngestParseAttempt();
  store.setCursor(store.cursor + 1);

  return {
    turn: { say: "" },
    event: { type: "ingestAnswer", command: "ingest" },
  };
}
