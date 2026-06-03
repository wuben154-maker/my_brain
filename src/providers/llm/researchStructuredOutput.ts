import type { RelationType } from "@/domain/graph";
import type { ConceptCandidate, ResearchPlan } from "./types";

const RELATION_TYPES: ReadonlySet<RelationType> = new Set([
  "is_a",
  "depends_on",
  "replaces",
  "related",
]);

export function isRelationType(value: unknown): value is RelationType {
  return typeof value === "string" && RELATION_TYPES.has(value as RelationType);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function parseRelations(value: unknown): ConceptCandidate["relations"] {
  if (!Array.isArray(value)) {
    return [];
  }
  const relations: ConceptCandidate["relations"] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const targetTitle = asString(record.targetTitle);
    if (!targetTitle || !isRelationType(record.relationType)) {
      continue;
    }
    relations.push({
      targetTitle,
      relationType: record.relationType,
    });
  }
  return relations;
}

/** Parse LLM JSON for planResearch — never throws. */
export function parseResearchPlanJson(raw: string): ResearchPlan | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const topic = asString(parsed.topic);
    if (!topic) {
      return null;
    }
    return {
      topic,
      subQuestions: asStringArray(parsed.subQuestions),
      suggestedSources: asStringArray(parsed.suggestedSources),
    };
  } catch {
    return null;
  }
}

/** Parse LLM JSON for synthesizeConcepts — never throws; filters invalid relation types. */
export function parseConceptCandidatesJson(raw: string): ConceptCandidate[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const candidates: ConceptCandidate[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const record = entry as Record<string, unknown>;
      const title = asString(record.title);
      const intro = asString(record.intro);
      if (!title || !intro) {
        continue;
      }
      const sourceUrl =
        record.sourceUrl === null ? null : asString(record.sourceUrl);
      candidates.push({
        title,
        intro,
        sourceUrl,
        relations: parseRelations(record.relations),
      });
    }
    return candidates;
  } catch {
    return [];
  }
}

export function emptyResearchPlan(topic: string): ResearchPlan {
  return {
    topic,
    subQuestions: [],
    suggestedSources: [],
  };
}

export function logResearchParseFailure(scope: string, detail: string): void {
  console.warn(`[openai-llm] ${scope} parse failed: ${detail.slice(0, 120)}`);
}
