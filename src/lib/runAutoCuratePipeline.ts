import { autoCurate } from "@/agent/curation/autoCurate";
import type { BrainGraphSnapshot } from "@/domain/graph";
import type { GraphHistoryEntry } from "@/domain/graphHistory";
import type { UserProfile } from "@/domain/profile";
import {
  applyGraphMutation,
  persistGraphSnapshot,
  visibleGraph,
} from "@/lib/graphMutations";
import { syncDisplayGraph } from "@/lib/syncDisplayGraph";
import type { LlmProvider } from "@/providers/llm/types";
import type { StorageProvider } from "@/storage/types";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";
import { useGraphStore } from "@/stores/graphStore";

export interface AutoCurateDeps {
  storage: StorageProvider;
  profile: UserProfile;
  llm?: LlmProvider | null;
}

function historyEntryFromApply(
  proposal: { id: string; kind: GraphHistoryEntry["kind"]; summary: string },
  before: BrainGraphSnapshot,
  after: BrainGraphSnapshot,
): GraphHistoryEntry {
  return {
    id: proposal.id,
    at: new Date().toISOString(),
    kind: proposal.kind,
    summary: proposal.summary,
    before,
    after,
  };
}

/** V4: after a confirmed ingest, auto-apply curation mutations and record undoable history. */
export async function runAutoCurateAfterIngest(
  newNodeId: string,
  deps: AutoCurateDeps,
): Promise<GraphHistoryEntry[]> {
  const fullGraph = await deps.storage.loadGraph();
  const newNode = fullGraph.nodes.find((node) => node.id === newNodeId);
  if (!newNode || newNode.archived) {
    return [];
  }

  const proposals = autoCurate(fullGraph, newNode, deps.profile);
  if (proposals.length === 0) {
    return [];
  }

  const historyStore = useGraphHistoryStore.getState();
  const recorded: GraphHistoryEntry[] = [];
  let working = fullGraph;

  for (const proposal of proposals) {
    const before = working;
    const after = applyGraphMutation(before, proposal);
    if (JSON.stringify(before) === JSON.stringify(after)) {
      continue;
    }
    await persistGraphSnapshot(deps.storage, before, after);
    const entry = historyEntryFromApply(proposal, before, after);
    await historyStore.record(deps.storage, entry);
    recorded.push(entry);
    working = after;
  }

  if (recorded.length > 0) {
    await syncDisplayGraph(deps.storage);
    const display = visibleGraph(await deps.storage.loadGraph());
    useGraphStore.getState().setGraph(display);
  }

  return recorded;
}
