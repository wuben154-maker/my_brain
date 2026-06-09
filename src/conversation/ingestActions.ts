import type { GraphMutationProposal } from "@/domain/graph";
import { buildSourceRefFromNewsItem } from "@/domain/graph/sourceRef";
import { readCreatePayload } from "@/domain/graphMutationPayloads";
import type { NewsItem } from "@/domain/news";import type { UserProfile } from "@/domain/profile";
import {
  applyGraphMutation,
  persistGraphSnapshot,
  primaryNodeIdFromProposal,
  visibleGraph,
} from "@/lib/graphMutations";
import { pulseIngestStarLight } from "@/lib/ingestStarLight";
import {
  prependGrounding,
  recallGroundingContext,
} from "@/lib/memoryGrounding";
import { runAutoCurateAfterIngest } from "@/lib/runAutoCuratePipeline";
import { syncDisplayGraph } from "@/lib/syncDisplayGraph";
import { isShowcaseDemoMode } from "@/showcase/showcaseDemoMode";
import {
  buildShowcaseIngestCreateProposal,
  SHOWCASE_DESIGNATED_INGEST_BRIEF_ID,
  SHOWCASE_NOW,
  SHOWCASE_WORLD_ITEMS,
} from "@/showcase/showcaseFixtures";import type { GraphHistoryEntry } from "@/domain/graphHistory";
import {
  formatCurationReport,
  shouldSpeakCurationReport,
} from "@/conversation/curationReport";
import type { LlmProvider } from "@/providers/llm/types";
import type { MemoryProvider } from "@/providers/memory/types";
import {
  recordBriefingElaborateTrace,
  recordBriefingIngestTrace,
  recordBriefingSkipTrace,
} from "@/learning/recordLearningTrace";
import type { StorageProvider } from "@/storage/types";
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

function resolveIngestedAt(): string {
  return isShowcaseDemoMode() ? SHOWCASE_NOW : new Date().toISOString();
}

function resolveWorldItemIdForNews(item: NewsItem): string | undefined {
  if (isShowcaseDemoMode()) {
    return SHOWCASE_WORLD_ITEMS.find((world) => world.sourceItemId === item.id)?.id;
  }
  return `radar-wi-${item.id}`;
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
  const sourceRef = buildSourceRefFromNewsItem(item, {
    ingestedAt: resolveIngestedAt(),
    worldItemId: resolveWorldItemIdForNews(item),
    kind: "briefing",
  });
  return {
    ...proposal,
    payload: {
      ...payload,
      intro,
      sourceUrl: item.sourceUrl ?? payload.sourceUrl,
      sourceRefs: [sourceRef],
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
  if (
    isShowcaseDemoMode() &&
    item.id === SHOWCASE_DESIGNATED_INGEST_BRIEF_ID
  ) {
    const explanation = useIngestStore.getState().explanation;
    return buildShowcaseIngestCreateProposal(explanation);
  }

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
export interface IngestCreateResult {
  nodeId: string | null;
  curationEntries: GraphHistoryEntry[];
}

export async function applyIngestCreate(
  item: NewsItem,
  deps: IngestDecisionDeps,
): Promise<IngestCreateResult> {
  const store = useIngestStore.getState();
  const explanation = store.explanation;
  const raw = await resolveCreateProposal(item, deps);
  if (!raw) {
    throw new Error("Mock LLM 未生成入库建议");
  }
  const proposal = buildCreateProposalFromNews(item, explanation, raw);
  const nodeId = await persistProposalToGraph(deps.storage, proposal);
  if (nodeId) {
    pulseIngestStarLight(nodeId);
  }
  const curationEntries =
    nodeId != null
      ? await runAutoCurateAfterIngest(nodeId, {
          storage: deps.storage,
          profile: deps.profile,
        })
      : [];
  return { nodeId, curationEntries };
}

export interface IngestDecisionResult {
  turn: Turn;
  event?: ConversationEvent;
  curationEntries?: GraphHistoryEntry[];
}

let lastCurationSpokenAt = 0;

function curationSayLine(entries: GraphHistoryEntry[]): string {
  const parts: string[] = [];
  for (const entry of entries) {
    if (!shouldSpeakCurationReport(entry, lastCurationSpokenAt)) {
      continue;
    }
    parts.push(formatCurationReport(entry));
    lastCurationSpokenAt = Date.now();
  }
  return parts.join("；");
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
    await recordBriefingElaborateTrace(item, depth, deps.storage);
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
    await recordBriefingSkipTrace(item, deps.storage);
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

  const { nodeId, curationEntries } = await applyIngestCreate(item, deps);
  if (nodeId) {
    await recordBriefingIngestTrace(item, nodeId, deps.storage);
  }
  store.markIngested(item.id);
  store.setExplanation("");
  store.resetElaborationDepth();
  store.resetIngestParseAttempt();
  store.setCursor(store.cursor + 1);

  const say = curationSayLine(curationEntries);

  return {
    turn: { say },
    event: { type: "ingestAnswer", command: "ingest" },
    curationEntries,
  };
}
