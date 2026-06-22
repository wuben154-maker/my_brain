import type { UserMode, UserModeProfile } from "../domain/userMode.js";
import type { GraphChangeRecord, GraphEdge, GraphNode } from "../graph/types.js";
import type { LearningTraceRecord, WorldItemRecord } from "../storage/mobileStorage.js";
import type { ProvisionalCandidate } from "../provisional/types.js";

export type MemoryWeatherOutputKind =
  | "trend"
  | "consolidation"
  | "material_aggregate"
  | "project_shift"
  | "recall_mood"
  | "mixed";

export type MemoryReplayOutputKind =
  | "ingest_timeline"
  | "learning_trace"
  | "capture_to_ingest"
  | "project_timeline"
  | "life_capture"
  | "mixed";

export type ReverseQuestionOutputKind =
  | "relation_why"
  | "deepen_concept"
  | "systemize_material"
  | "next_step"
  | "recall_day"
  | "mixed";

export interface M5EvidenceBundle {
  graphChanges: GraphChangeRecord[];
  learningTraces: LearningTraceRecord[];
  radarSignals: WorldItemRecord[];
  captures: ProvisionalCandidate[];
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface MemoryWeatherCard {
  outputKind: MemoryWeatherOutputKind;
  headline: string;
  detail: string;
  evidenceRefs: string[];
  confidence: number;
  degraded?: boolean;
}

export interface MemoryWeatherResult {
  visible: boolean;
  cards: MemoryWeatherCard[];
  degradedReason?: string;
}

export interface MemoryReplayFrame {
  changeId: string;
  summary: string;
  evidenceRefs: string[];
  at: string;
}

export interface MemoryReplayResult {
  visible: boolean;
  outputKind: MemoryReplayOutputKind;
  frames: MemoryReplayFrame[];
  cursor: string | null;
  durationMs: number;
}

export interface ReverseQuestionResult {
  visible: boolean;
  outputKind: ReverseQuestionOutputKind;
  prompt: string;
  evidenceRefs: string[];
  nodeIds: string[];
}

export interface M5SignatureExperiences {
  weather: MemoryWeatherResult;
  replay: MemoryReplayResult;
  reverseQuestion: ReverseQuestionResult;
}

export interface M5FixtureExpected {
  memoryWeather: { outputKind: MemoryWeatherOutputKind; evidenceRefsMin: number };
  memoryReplay: { outputKind: MemoryReplayOutputKind; evidenceRefsMin: number };
  reverseQuestion: { outputKind: ReverseQuestionOutputKind; evidenceRefsMin: number };
}

export interface M5ModeFixture {
  id: string;
  primaryMode: UserMode;
  primaryModeLabel: string;
  secondaryModes?: UserMode[];
  sqliteSeed?: string;
  profile: UserModeProfile;
  expected: M5FixtureExpected;
}

export const M5_REPLAY_DURATION_MS = 20_000;
export const M5_REPLAY_BATCH_LIMIT = 24;
export const M5_VISIBLE_NODE_BUDGET = 80;
