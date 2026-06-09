import type { BrainGraphSnapshot } from "@/domain/graph";
import type { UserProfile } from "@/domain/profile";
import { getInterestWeight } from "@/domain/profile/userProfile";
import type {
  RadarReasonCode,
  RadarSignal,
  WorldItemScored,
} from "@/domain/radar/radarSignal";
import type { WorldItem } from "@/domain/radar/worldItem";

export interface RelevanceScorerInput {
  graph: BrainGraphSnapshot;
  profile: UserProfile;
  item: WorldItem;
}

export interface RelevanceScorer {
  score(input: RelevanceScorerInput): WorldItemScored;
}

type SignalRule = (input: RelevanceScorerInput, text: string) => RadarSignal | null;

const WEAK_SCORE = 0.32;

export class MockRelevanceScorer implements RelevanceScorer {
  private readonly rules: SignalRule[] = [
    realtimeRule,
    voiceProviderRule,
    graphMemoryRule,
    mcpRule,
    localFirstRule,
    llmContextRule,
    trendRule,
    weakTangentRule,
  ];

  score(input: RelevanceScorerInput): WorldItemScored {
    if (input.item.status !== "active") {
      return { item: input.item, score: 0, signals: [] };
    }

    const text = `${input.item.title}\n${input.item.summary}`.toLowerCase();
    const signals = this.rules
      .map((rule) => rule(input, text))
      .filter((signal): signal is RadarSignal => Boolean(signal));

    const rawScore =
      signals.length > 0 ? Math.max(...signals.map((signal) => signal.score)) : 0.05;
    const score = applyProfileInterestBoost(input.profile, input.item.id, rawScore);
    return {
      item: input.item,
      score,
      signals,
    };
  }
}

function realtimeRule(input: RelevanceScorerInput, text: string): RadarSignal | null {
  if (!containsAny(text, ["realtime", "barge-in", "speech-to-speech"])) {
    return null;
  }
  return signal(input.item.id, "project_adjacent", "涉及实时语音与打断能力，与你的语音伴侣项目方向一致。", [
    "demo-agent",
  ], 0.96);
}

function voiceProviderRule(input: RelevanceScorerInput, text: string): RadarSignal | null {
  if (!containsAny(text, ["voiceprovider", "voice provider", "voice-agent", "voice agent"])) {
    return null;
  }
  return signal(input.item.id, "project_adjacent", "涉及 VoiceProvider 抽象，与你的实时语音方案一致。", [
    "demo-agent",
  ], 0.93);
}

function graphMemoryRule(input: RelevanceScorerInput, text: string): RadarSignal | null {
  if (!containsAny(text, ["graph memory", "knowledge graph", "temporal knowledge", "graphiti"])) {
    return null;
  }
  const score = text.includes("graphiti") ? 0.94 : 0.91;
  return signal(input.item.id, "graph_concept_overlap", "与你图谱中的 RAG、AI Agent 相关，可补强个人知识图谱方向。", [
    "demo-rag",
    "demo-agent",
  ], score);
}

function mcpRule(input: RelevanceScorerInput, text: string): RadarSignal | null {
  if (!containsAny(text, ["mcp", "model context protocol"])) {
    return null;
  }
  return signal(input.item.id, "graph_concept_overlap", "与你图谱中的 MCP、AI Agent 相关，适合作为集成能力参考。", [
    "demo-mcp",
    "demo-agent",
  ], 0.89);
}

function localFirstRule(input: RelevanceScorerInput, text: string): RadarSignal | null {
  if (!containsAny(text, ["local-first", "sqlite"])) {
    return null;
  }
  return signal(input.item.id, "project_adjacent", "涉及 local-first 与 SQLite，贴近 my_brain 的本地优先架构。", [], 0.86);
}

function llmContextRule(input: RelevanceScorerInput, text: string): RadarSignal | null {
  if (!containsAny(text, ["llm", "long-context", "long context"])) {
    return null;
  }
  return signal(input.item.id, "interest_match", "匹配你的 AI 基础设施兴趣，但与当前图谱只是间接相关。", [
    "demo-llm",
  ], 0.64);
}

function trendRule(input: RelevanceScorerInput, text: string): RadarSignal | null {
  if (input.item.kind !== "github_trending" || !containsAny(text, ["agent", "desktop-ai"])) {
    return null;
  }
  return signal(input.item.id, "trend_anomaly", "GitHub 趋势与 Agent/桌面 AI 项目相邻，值得短暂关注。", [
    "demo-agent",
  ], 0.58);
}

function weakTangentRule(input: RelevanceScorerInput, text: string): RadarSignal | null {
  if (!containsAny(text, ["multilingual", "companion ui", "visualization", "force-directed"])) {
    return null;
  }
  return signal(input.item.id, "weak_tangent", "与 LLM、伴侣 UI 或图谱可视化间接相关，优先级较低。", [], WEAK_SCORE);
}

function signal(
  worldItemId: string,
  reasonCode: RadarReasonCode,
  explanation: string,
  linkedNodeIds: string[],
  score: number,
): RadarSignal {
  return { worldItemId, reasonCode, explanation, linkedNodeIds, score };
}

function containsAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

/** C2: profile interest weight nudges realtime-related fixture ranking deterministically. */
function applyProfileInterestBoost(
  profile: UserProfile,
  worldItemId: string,
  baseScore: number,
): number {
  if (!profile.interestEntries?.length) {
    return clamp01(baseScore);
  }
  const voiceWeight = getInterestWeight(profile.interestEntries, "voice_realtime");
  if (worldItemId === "radar-wi-rel-1" && Math.abs(voiceWeight - 0.5) > 0.01) {
    return clamp01(baseScore * interestWeightMultiplier(voiceWeight));
  }
  return clamp01(baseScore);
}

function interestWeightMultiplier(weight: number): number {
  return 0.6 + weight * 0.5;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}
