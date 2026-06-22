import type { UserMode, UserModeProfile } from "../domain/userMode.js";
import {
  captureRef,
  graphChangeRef,
  hasAnyEvidence,
  learningTraceRef,
  radarSignalRef,
} from "./evidence.js";
import type {
  M5EvidenceBundle,
  MemoryWeatherCard,
  MemoryWeatherOutputKind,
  MemoryWeatherResult,
} from "./types.js";

function weatherKindForMode(mode: UserMode): MemoryWeatherOutputKind {
  const map: Record<UserMode, MemoryWeatherOutputKind> = {
    tech_tracker: "trend",
    learner: "consolidation",
    creator_researcher: "material_aggregate",
    founder_project: "project_shift",
    personal_memory: "recall_mood",
  };
  return map[mode];
}

function buildCardsForMode(
  profile: UserModeProfile,
  bundle: M5EvidenceBundle,
  learningTraceWarning: boolean,
): MemoryWeatherCard[] {
  const primary = profile.primaryMode;
  const outputKind = weatherKindForMode(primary);
  const cards: MemoryWeatherCard[] = [];

  for (const change of bundle.graphChanges.slice(0, 3)) {
    cards.push({
      outputKind,
      headline: change.summary,
      detail: `图谱变化 · ${change.kind}`,
      evidenceRefs: [graphChangeRef(change.id)],
      confidence: 0.85,
      degraded: learningTraceWarning,
    });
  }

  for (const trace of bundle.learningTraces.slice(0, 2)) {
    cards.push({
      outputKind: primary === "learner" ? "consolidation" : outputKind,
      headline: trace.topic,
      detail: trace.note,
      evidenceRefs: [learningTraceRef(trace.id)],
      confidence: 0.8,
      degraded: learningTraceWarning,
    });
  }

  for (const signal of bundle.radarSignals.slice(0, 2)) {
    cards.push({
      outputKind: primary === "tech_tracker" ? "trend" : outputKind,
      headline: signal.title,
      detail: `新鲜度 ${Math.round(signal.freshness * 100)}%`,
      evidenceRefs: [radarSignalRef(signal.id)],
      confidence: signal.freshness,
    });
  }

  for (const capture of bundle.captures.filter((c) => c.status !== "rejected").slice(0, 2)) {
    cards.push({
      outputKind:
        primary === "creator_researcher" || primary === "personal_memory"
          ? outputKind
          : "material_aggregate",
      headline: capture.summary,
      detail: `捕获 · ${capture.sourceType}`,
      evidenceRefs: [captureRef(capture.id)],
      confidence: 0.75,
    });
  }

  return cards.filter((c) => c.evidenceRefs.length > 0);
}

export function buildMemoryWeather(
  profile: UserModeProfile,
  bundle: M5EvidenceBundle,
  options?: { learningTraceWarning?: boolean },
): MemoryWeatherResult {
  if (!hasAnyEvidence(bundle)) {
    return { visible: false, cards: [] };
  }

  const cards = buildCardsForMode(
    profile,
    bundle,
    options?.learningTraceWarning ?? false,
  );

  if (cards.length === 0) {
    return { visible: false, cards: [] };
  }

  return {
    visible: true,
    cards,
    degradedReason: options?.learningTraceWarning
      ? "learning_trace_persist_warning"
      : undefined,
  };
}
