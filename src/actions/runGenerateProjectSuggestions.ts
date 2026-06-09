import { generateProjectSuggestions } from "@/cognitive/generateProjectSuggestions";
import type { BrainGraphSnapshot } from "@/domain/graph";
import type { CognitiveAction } from "@/domain/actions/cognitiveAction";
import type { WorldItem } from "@/domain/radar/worldItem";
import type { WeeklyBrainReview } from "@/domain/review/weeklyBrainReview";
import type { StorageProvider } from "@/storage/types";
import { useCognitiveActionStore } from "@/stores/cognitiveActionStore";
import { useProjectSuggestionsStore } from "@/stores/projectSuggestionsStore";

export interface RunGenerateProjectSuggestionsInput {
  graph: BrainGraphSnapshot;
  trendItems?: WorldItem[];
  weeklyReview?: WeeklyBrainReview;
  storage?: StorageProvider | null;
  openOverlay?: boolean;
}

/** Generate draft actions, persist to cognitiveActionStore, optionally open overlay. */
export async function runGenerateProjectSuggestions(
  input: RunGenerateProjectSuggestionsInput,
): Promise<CognitiveAction[]> {
  const { actions } = generateProjectSuggestions({
    graph: input.graph,
    trendItems: input.trendItems,
    weeklyReview: input.weeklyReview,
  });
  const storage = input.storage ?? null;
  const stored: CognitiveAction[] = [];
  for (const action of actions) {
    const row = await useCognitiveActionStore.getState().createAndStore(storage, {
      id: action.id,
      kind: action.kind,
      title: action.title,
      bodyMarkdown: action.bodyMarkdown,
      citations: action.citations,
      metadata: action.metadata,
      createdAt: action.createdAt,
    });
    stored.push(row);
  }
  if (input.openOverlay !== false) {
    useProjectSuggestionsStore.getState().openSuggestions(stored);
  }
  return stored;
}
