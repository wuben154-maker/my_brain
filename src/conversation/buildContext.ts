import { visibleGraph } from "@/lib/graphMutations";
import type { ConversationContext, OnboardingProgress } from "@/conversation/types";
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
}): ConversationContext {
  const onboarding = resolveOnboarding(
    input.graph,
    input.profile,
    input.onboarding,
  );
  return {
    newsQueue: input.newsQueue,
    newsCursor: input.newsCursor,
    graph: input.graph,
    profile: input.profile,
    personaId: input.profile.persona,
    recalledMemories: input.recalledMemories,
    onboarding,
  };
}

export { DEFAULT_ONBOARDING };
