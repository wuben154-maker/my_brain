import { autoCurate } from "@/agent/curation/autoCurate";
import { autoCurateForShowcase } from "@/showcase/showcaseFixtures";
import { isShowcaseDemoMode } from "@/showcase/showcaseDemoMode";
import type { GraphHistoryEntry } from "@/domain/graphHistory";
import type { UserProfile } from "@/domain/profile";
import { buildGraphHistoryEntry } from "@/lib/graphHistoryMeta";
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

/** V4: after a confirmed ingest, auto-apply curation mutations and record undoable history. */
export async function runAutoCurateAfterIngest(
  newNodeId: string,
  deps: AutoCurateDeps,
): Promise<GraphHistoryEntry[]> {
  const visible = await deps.storage.loadGraph();
  const newNode = visible.nodes.find((node) => node.id === newNodeId);
  if (!newNode || newNode.archived) {
    return [];
  }

  const proposals = isShowcaseDemoMode()
    ? autoCurateForShowcase(visible, newNode)
    : await autoCurate(visible, newNode, deps.profile);
  if (proposals.length === 0) {
    return [];
  }

  const historyStore = useGraphHistoryStore.getState();
  const recorded: GraphHistoryEntry[] = [];
  // Full snapshot (incl. archived) so undo never hard-deletes archived nodes.
  let working = await deps.storage.loadGraphForDisplay();

  for (const proposal of proposals) {
    const before = working;
    const after = applyGraphMutation(before, proposal);
    if (JSON.stringify(before) === JSON.stringify(after)) {
      continue;
    }
    await persistGraphSnapshot(deps.storage, before, after);
    const entry = buildGraphHistoryEntry(proposal, before, after);
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
