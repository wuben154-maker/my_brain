import type { UserMode } from "../domain/userMode.js";
import type { GraphChangeRecord, GraphEdge, GraphNode } from "../graph/types.js";
import type { LearningTraceRecord, WorldItemRecord } from "../storage/mobileStorage.js";
import type { ProvisionalCandidate } from "../provisional/types.js";
import { buildEvidenceBundle } from "./evidence.js";
import { buildM5SignatureExperiences } from "./signatureExperiences.js";
import type { M5ModeFixture, M5SignatureExperiences } from "./types.js";

export const M5_MODE_FIXTURES: M5ModeFixture[] = [
  {
    id: "m5-tech-tracker",
    primaryMode: "tech_tracker",
    primaryModeLabel: "技术追踪者",
    sqliteSeed: "apps/mobile/fixtures/m5-modes/m5-tech-tracker/seed.json",
    profile: {
      primaryMode: "tech_tracker",
      secondaryModes: [],
      confidence: 0.82,
      recentIntent: "跟进 AI 与开源趋势",
    },
    expected: {
      memoryWeather: { outputKind: "trend", evidenceRefsMin: 1 },
      memoryReplay: { outputKind: "ingest_timeline", evidenceRefsMin: 1 },
      reverseQuestion: { outputKind: "relation_why", evidenceRefsMin: 1 },
    },
  },
  {
    id: "m5-learner",
    primaryMode: "learner",
    primaryModeLabel: "学习者",
    sqliteSeed: "apps/mobile/fixtures/m5-modes/m5-learner/seed.json",
    profile: {
      primaryMode: "learner",
      secondaryModes: [],
      confidence: 0.8,
      recentIntent: "系统学习 Rust 所有权",
    },
    expected: {
      memoryWeather: { outputKind: "consolidation", evidenceRefsMin: 1 },
      memoryReplay: { outputKind: "learning_trace", evidenceRefsMin: 1 },
      reverseQuestion: { outputKind: "deepen_concept", evidenceRefsMin: 1 },
    },
  },
  {
    id: "m5-creator-researcher",
    primaryMode: "creator_researcher",
    primaryModeLabel: "创作者/研究者",
    sqliteSeed: "apps/mobile/fixtures/m5-modes/m5-creator-researcher/seed.json",
    profile: {
      primaryMode: "creator_researcher",
      secondaryModes: [],
      confidence: 0.78,
      recentIntent: "整理引用与素材",
    },
    expected: {
      memoryWeather: { outputKind: "material_aggregate", evidenceRefsMin: 1 },
      memoryReplay: { outputKind: "capture_to_ingest", evidenceRefsMin: 1 },
      reverseQuestion: { outputKind: "systemize_material", evidenceRefsMin: 1 },
    },
  },
  {
    id: "m5-entrepreneur-project",
    primaryMode: "founder_project",
    primaryModeLabel: "创业/项目型",
    sqliteSeed: "apps/mobile/fixtures/m5-modes/m5-entrepreneur-project/seed.json",
    profile: {
      primaryMode: "founder_project",
      secondaryModes: [],
      confidence: 0.77,
      recentIntent: "推进产品里程碑",
    },
    expected: {
      memoryWeather: { outputKind: "project_shift", evidenceRefsMin: 1 },
      memoryReplay: { outputKind: "project_timeline", evidenceRefsMin: 1 },
      reverseQuestion: { outputKind: "next_step", evidenceRefsMin: 1 },
    },
  },
  {
    id: "m5-personal-life",
    primaryMode: "personal_memory",
    primaryModeLabel: "个人记忆/生活型",
    sqliteSeed: "apps/mobile/fixtures/m5-modes/m5-personal-life/seed.json",
    profile: {
      primaryMode: "personal_memory",
      secondaryModes: [],
      confidence: 0.76,
      recentIntent: "记录生活灵感",
    },
    expected: {
      memoryWeather: { outputKind: "recall_mood", evidenceRefsMin: 1 },
      memoryReplay: { outputKind: "life_capture", evidenceRefsMin: 1 },
      reverseQuestion: { outputKind: "recall_day", evidenceRefsMin: 1 },
    },
  },
  {
    id: "m5-mixed-learner-life",
    primaryMode: "learner",
    primaryModeLabel: "学习者",
    secondaryModes: ["personal_memory"],
    sqliteSeed: "apps/mobile/fixtures/m5-modes/m5-mixed-learner-life/seed.json",
    profile: {
      primaryMode: "learner",
      secondaryModes: ["personal_memory"],
      confidence: 0.81,
      recentIntent: "学 Rust 也记生活灵感",
    },
    expected: {
      memoryWeather: { outputKind: "consolidation", evidenceRefsMin: 1 },
      memoryReplay: { outputKind: "learning_trace", evidenceRefsMin: 1 },
      reverseQuestion: { outputKind: "deepen_concept", evidenceRefsMin: 1 },
    },
  },
];

export interface M5FixtureSeedData {
  graphChanges?: GraphChangeRecord[];
  learningTraces?: LearningTraceRecord[];
  radarSignals?: WorldItemRecord[];
  captures?: ProvisionalCandidate[];
  nodes?: GraphNode[];
  edges?: GraphEdge[];
}

export function runM5Fixture(
  fixture: M5ModeFixture,
  seedData: M5FixtureSeedData,
): M5SignatureExperiences {
  const evidence = buildEvidenceBundle(seedData);
  return buildM5SignatureExperiences({
    profile: fixture.profile,
    evidence,
    reverseQuestionSeed: fixture.id,
  });
}

export function getM5FixtureById(id: string): M5ModeFixture | undefined {
  return M5_MODE_FIXTURES.find((f) => f.id === id);
}

export function getM5FixtureByMode(mode: UserMode): M5ModeFixture | undefined {
  return M5_MODE_FIXTURES.find((f) => f.primaryMode === mode && !f.secondaryModes?.length);
}
