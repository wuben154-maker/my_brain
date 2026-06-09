import type { ConversationContext } from "@/conversation/types";
import { DEFAULT_ONBOARDING } from "@/conversation/types";
import type { NewsItem } from "@/domain/news";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import {
  createShowcaseGraphSnapshot,
  SHOWCASE_BRIEFING_ITEMS,
  SHOWCASE_PROFILE,
} from "@/showcase/showcaseFixtures";

export { SHOWCASE_BRIEFING_ITEMS };

export const FIXTURE_NEWS: NewsItem[] = [
  {
    id: "fixture-news-1",
    category: "ai_news",
    title: "Transformer 上下文窗口再扩展",
    summary: "更长 context 支持整本书级别输入。",
    sourceName: "Mock RSS",
    sourceUrl: "https://example.com/context",
    publishedAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "fixture-news-2",
    category: "github_trending",
    title: "agent-framework-starter",
    summary: "脚手架型 Agent 编排 starter。",
    sourceName: "GitHub Trending",
    sourceUrl: "https://github.com/example/starter",
    publishedAt: "2026-06-02T00:00:00.000Z",
  },
];

export function createFixtureContext(
  overrides: Partial<ConversationContext> = {},
): ConversationContext {
  return {
    newsQueue: FIXTURE_NEWS,
    newsCursor: 0,
    graph: { nodes: [], edges: [] },
    profile: DEFAULT_USER_PROFILE,
    personaId: "mentor",
    onboarding: { active: true, step: "intro", interestRounds: 0 },
    ...overrides,
  };
}

export function createIdleCompanionContext(
  overrides: Partial<ConversationContext> = {},
): ConversationContext {
  return {
    newsQueue: FIXTURE_NEWS,
    newsCursor: 0,
    graph: { nodes: [], edges: [] },
    profile: { ...DEFAULT_USER_PROFILE, persona: "geek" },
    personaId: "geek",
    onboarding: DEFAULT_ONBOARDING,
    ...overrides,
  };
}

/** KOS-A2: showcase companion harness context — pre-seeded graph + three briefs, no onboarding. */
export function createShowcaseCompanionContext(
  overrides: Partial<ConversationContext> = {},
): ConversationContext {
  const snapshot = createShowcaseGraphSnapshot();
  return {
    newsQueue: SHOWCASE_BRIEFING_ITEMS,
    newsCursor: 0,
    graph: snapshot,
    profile: SHOWCASE_PROFILE,
    personaId: SHOWCASE_PROFILE.persona,
    onboarding: DEFAULT_ONBOARDING,
    ...overrides,
  };
}
