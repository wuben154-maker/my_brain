import type { UserMode, UserModeProfile } from "../domain/userMode.js";
import type { GraphRepository } from "../graph/types.js";

/** External headline source kinds — not permanent graph nodes. */
export type WorldSourceType = "rss" | "github" | "news" | "blog" | "paper" | "fixture";

export interface WorldItem {
  id: string;
  title: string;
  summary: string;
  /** Human-readable source label (feed name, publisher, repo org). */
  source: string;
  url: string;
  /** ISO8601 — prefer published time; falls back to observedAt via worldItemDisplayTime. */
  publishedAt: string | null;
  observedAt: string;
  sourceType: WorldSourceType;
}

export interface WorldSignal {
  id: string;
  worldItemId: string;
  evidence: string[];
  whyUsefulToUser: string;
  userModeFit: UserMode;
  confidence: number;
}

export interface ExternalHeadlineInput {
  title: string;
  url: string;
  sourceType: WorldSourceType;
  summary?: string;
  /** Human-readable source; defaults from sourceType when omitted. */
  source?: string;
  publishedAt?: string | null;
}

export interface WorldObservation {
  item: WorldItem;
  signal: WorldSignal;
}

export const DEFAULT_WORLD_SOURCE_LABELS: Record<WorldSourceType, string> = {
  rss: "RSS",
  github: "GitHub",
  news: "新闻",
  blog: "博客",
  paper: "论文",
  fixture: "演示",
};

/** CK-14 fixture headlines — signal-only, never auto-ingest. */
export const WORLD_OBSERVER_FIXTURE_HEADLINES: readonly ExternalHeadlineInput[] = [
  {
    title: "Realtime transport 新增断线恢复方案",
    url: "https://github.com/example/realtime-transport/releases/v2.1.0",
    sourceType: "github",
    source: "GitHub Release",
    summary: "新增断线恢复与 barge-in 状态机改进。",
    publishedAt: "2026-06-21T08:12:00.000Z",
  },
  {
    title: "Personal knowledge agent 的记忆边界",
    url: "https://example.com/blog/personal-knowledge-agent-boundaries",
    sourceType: "paper",
    source: "论文 / 博客",
    summary: "讨论外部信息与长期记忆的隔离策略。",
    publishedAt: "2026-06-21T00:00:00.000Z",
  },
  {
    title: "如何解释语音 Provider 抽象",
    url: "https://example.com/learn/voice-provider-abstraction",
    sourceType: "blog",
    source: "学习材料",
    summary: "用项目例子解释 VoiceProvider 接口设计。",
    publishedAt: "2026-06-20T18:00:00.000Z",
  },
] as const;

let worldItemSeq = 0;

function nextWorldItemId(title: string, url: string): string {
  worldItemSeq += 1;
  const slug = `${title.slice(0, 24)}:${url}`.replace(/\s+/g, "-");
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return `world-${worldItemSeq}-${hash.toString(36)}`;
}

function resolveWorldItemSource(input: ExternalHeadlineInput): string {
  const explicit = input.source?.trim();
  if (explicit) {
    return explicit;
  }
  return DEFAULT_WORLD_SOURCE_LABELS[input.sourceType];
}

/** Prefer published time; fall back to observation time for display/sorting. */
export function worldItemDisplayTime(item: WorldItem): string {
  return item.publishedAt ?? item.observedAt;
}

/** Normalize external headline into a non-permanent WorldItem. */
export function buildWorldItemFromHeadline(
  input: ExternalHeadlineInput,
  observedAt = new Date().toISOString(),
): WorldItem {
  const title = input.title.trim();
  const url = input.url.trim();
  if (!title || !url) {
    throw new Error("WorldItem requires non-empty title and url");
  }
  return {
    id: nextWorldItemId(title, url),
    title,
    summary: (input.summary ?? title).trim(),
    source: resolveWorldItemSource(input),
    url,
    publishedAt: input.publishedAt ?? null,
    observedAt,
    sourceType: input.sourceType,
  };
}

const MODE_RELEVANCE: Record<UserMode, string> = {
  tech_tracker: "与你追踪技术趋势、AI 与开源动态的兴趣相关",
  learner: "可作为你当前学习主题的延伸材料",
  creator_researcher: "可作为研究或内容创作的参考线索",
  founder_project: "可能关联你正在推进的项目或决策",
  personal_memory: "可作为个人记录或灵感的参考，不会自动入库",
};

function titleMatchesProfileIntent(title: string, profile: UserModeProfile): boolean {
  const intent = profile.recentIntent?.trim();
  if (!intent) {
    return false;
  }
  const tokens = intent.split(/[\s，。；,\n]+/).filter((t) => t.length >= 2);
  return tokens.some((token) => title.includes(token));
}

function relevanceConfidence(item: WorldItem, profile: UserModeProfile): number {
  let confidence = Math.min(0.55 + profile.confidence * 0.25, 0.9);
  if (titleMatchesProfileIntent(item.title, profile)) {
    confidence = Math.min(confidence + 0.12, 0.95);
  }
  if (item.sourceType === "github" && profile.primaryMode === "tech_tracker") {
    confidence = Math.min(confidence + 0.05, 0.95);
  }
  return confidence;
}

let worldSignalSeq = 0;

function nextWorldSignalId(worldItemId: string): string {
  worldSignalSeq += 1;
  return `wsignal-${worldSignalSeq}-${worldItemId}`;
}

/** Attach user-relevance reason to a WorldItem — signal only, no graph write. */
export function buildWorldSignal(item: WorldItem, profile: UserModeProfile): WorldSignal {
  const intentHint = titleMatchesProfileIntent(item.title, profile)
    ? `，且与近期意图「${profile.recentIntent}」有字面相交`
    : "";
  return {
    id: nextWorldSignalId(item.id),
    worldItemId: item.id,
    evidence: [
      `world-item:${item.id}`,
      `url:${item.url}`,
      `source:${item.source}`,
      `source-type:${item.sourceType}`,
      `time:${worldItemDisplayTime(item)}`,
      `observed:${item.observedAt}`,
    ],
    whyUsefulToUser: `${MODE_RELEVANCE[profile.primaryMode]}${intentHint}。`,
    userModeFit: profile.primaryMode,
    confidence: relevanceConfidence(item, profile),
  };
}

/** Observe external headlines as WorldItem + WorldSignal pairs — no permanent graph writes. */
export function observeWorldHeadlines(
  headlines: readonly ExternalHeadlineInput[],
  profile: UserModeProfile,
  observedAt = new Date().toISOString(),
): WorldObservation[] {
  return headlines.map((headline) => {
    const item = buildWorldItemFromHeadline(headline, observedAt);
    const signal = buildWorldSignal(item, profile);
    return { item, signal };
  });
}

/** Guard: world observer must not create permanent graph nodes. */
export function assertWorldObserverDoesNotMutateGraph(
  graph: GraphRepository,
  beforeNodes: number,
): void {
  if (graph.countVisibleNodes() !== beforeNodes) {
    throw new Error("world observer must not create permanent graph nodes");
  }
}
