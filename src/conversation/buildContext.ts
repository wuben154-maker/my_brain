import {
  buildTieredContext,
  createEmptyWorking,
  refreshWorkingPack,
  type WorkingContext,
} from "@/conversation/contextTiers";
import { visibleGraph } from "@/lib/graphMutations";
import { conversationStateToPackMode } from "@/lib/graphContextPack";
import type {
  ConversationContext,
  ConversationState,
  OnboardingProgress,
} from "@/conversation/types";
import { DEFAULT_ONBOARDING } from "@/conversation/types";
import type { NewsItem } from "@/domain/news";
import type { UserProfile } from "@/domain/profile";
import type { BrainGraphSnapshot } from "@/domain/graph";

export function shouldActivateOnboarding(
  graph: BrainGraphSnapshot,
  profile: UserProfile,
): boolean {
  const visible = visibleGraph(graph);
  if (visible.nodes.length > 0) {
    return false;
  }
  return (
    !profile.displayName &&
    profile.interests.length === 0 &&
    profile.knownTopics.length === 0
  );
}

export function resolveOnboarding(
  graph: BrainGraphSnapshot,
  profile: UserProfile,
  stored: OnboardingProgress,
): OnboardingProgress {
  if (stored.step === "done" && !stored.active) {
    if (shouldActivateOnboarding(graph, profile)) {
      return { active: true, step: "intro", interestRounds: 0 };
    }
    return stored;
  }
  if (!stored.active && stored.step !== "done") {
    return { ...stored, active: true };
  }
  return stored;
}

export function buildConversationContext(input: {
  newsQueue: NewsItem[];
  newsCursor: number;
  graph: BrainGraphSnapshot;
  profile: UserProfile;
  onboarding: OnboardingProgress;
  recalledMemories?: string;
  conversationState?: ConversationState;
  packQuery?: string;
  highlightNodeIds?: string[];
  working?: WorkingContext;
}): ConversationContext {
  const onboarding = resolveOnboarding(
    input.graph,
    input.profile,
    input.onboarding,
  );

  const conversationState = input.conversationState ?? "idle_chat";
  const packMode = conversationStateToPackMode(conversationState);
  const currentNews = input.newsQueue[input.newsCursor] ?? null;

  const working = input.working ?? createEmptyWorking(conversationState);
  working.state = conversationState;
  if (currentNews) {
    working.activeNewsId = currentNews.id;
  }
  if (input.highlightNodeIds && input.highlightNodeIds.length > 0) {
    working.walkthroughNodeIds = [...input.highlightNodeIds];
  }

  refreshWorkingPack(
    {
      graph: input.graph,
      profile: input.profile,
      recalledMemories: input.recalledMemories,
    },
    working,
    {
      packQuery: input.packQuery,
      newsTitle: currentNews?.title,
    },
  );

  if (import.meta.env.DEV && working.pack) {
    console.debug("[graphContextPack]", {
      mode: working.pack.mode,
      nodeIds: working.pack.nodeIds,
      tokenEstimate: working.pack.tokenEstimate,
    });
  }

  const tiered = buildTieredContext({
    archival: {
      graph: input.graph,
      profile: input.profile,
      recalledMemories: input.recalledMemories,
    },
    working,
    mode: packMode,
  });

  return {
    newsQueue: input.newsQueue,
    newsCursor: input.newsCursor,
    onboarding,
    ...tiered,
  };
}

export { DEFAULT_ONBOARDING };
