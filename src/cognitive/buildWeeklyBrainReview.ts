import type { BrainGraphSnapshot } from "@/domain/graph";
import type { GraphHistoryEntry } from "@/domain/graphHistory";
import type { LearningTrace } from "@/domain/learning/learningTrace";
import type { UserProfile } from "@/domain/profile";
import type { UnderstandingLevel } from "@/domain/profile/userProfile";
import {
  citationKey,
  isTimestampInWeekRange,
  type WeekRange,
  type WeeklyBrainReview,
  type WeeklyBrainReviewCitation,
  type WeeklyBrainReviewSection,
  type WeeklyBrainReviewSectionKind,
} from "@/domain/review/weeklyBrainReview";

export interface BuildWeeklyBrainReviewInput {
  graph: BrainGraphSnapshot;
  history: GraphHistoryEntry[];
  traces: LearningTrace[];
  profile: UserProfile;
  weekRange: WeekRange;
  /** Frozen clock for deterministic markdown header; defaults to week end. */
  generatedAt?: string;
}

const SECTION_TITLES: Record<WeeklyBrainReviewSectionKind, string> = {
  graph_changes: "本周图谱结构变更",
  new_concepts: "新增概念",
  merged_archived: "合并与归档",
  learning_activity: "学习与追问",
  weak_spots: "薄弱点",
  next_steps: "下一步建议",
};

const TRACE_KIND_LABEL: Record<LearningTrace["kind"], string> = {
  briefing_skip: "跳过简报",
  briefing_elaborate: "追问简报",
  briefing_ingest: "确认入库",
  node_review: "复习概念",
  teaching_followup: "教学追问",
};

function nodeTitle(graph: BrainGraphSnapshot, nodeId: string): string {
  return graph.nodes.find((node) => node.id === nodeId)?.title ?? nodeId;
}

function addCitation(
  map: Map<string, WeeklyBrainReviewCitation>,
  citation: WeeklyBrainReviewCitation,
): string {
  const key = citationKey(citation.type, citation.id);
  if (!map.has(key)) {
    map.set(key, citation);
  }
  return key;
}

function filterWeekHistory(
  history: GraphHistoryEntry[],
  weekRange: WeekRange,
): GraphHistoryEntry[] {
  return history
    .filter((entry) => !entry.undone && isTimestampInWeekRange(entry.at, weekRange))
    .sort((a, b) => a.at.localeCompare(b.at));
}

function filterWeekTraces(
  traces: LearningTrace[],
  weekRange: WeekRange,
): LearningTrace[] {
  return traces
    .filter((trace) => isTimestampInWeekRange(trace.at, weekRange))
    .sort((a, b) => a.at.localeCompare(b.at));
}

function weakConceptIds(profile: UserProfile): string[] {
  const ids = new Set<string>();
  for (const topic of profile.unknownTopics) {
    ids.add(topic);
  }
  const understanding = profile.understanding ?? {};
  for (const [conceptId, level] of Object.entries(understanding)) {
    if (level === ("unfamiliar" satisfies UnderstandingLevel)) {
      ids.add(conceptId);
    }
  }
  return [...ids].sort();
}

function buildGraphChangesSection(
  weekHistory: GraphHistoryEntry[],
  citations: Map<string, WeeklyBrainReviewCitation>,
): Pick<WeeklyBrainReviewSection, "body" | "citationKeys"> {
  if (weekHistory.length === 0) {
    return { body: "回顾窗口内无结构变更。", citationKeys: [] };
  }
  const counts = new Map<string, number>();
  const keys: string[] = [];
  for (const entry of weekHistory) {
    counts.set(entry.kind, (counts.get(entry.kind) ?? 0) + 1);
    keys.push(
      addCitation(citations, {
        type: "historyEntry",
        id: entry.id,
        label: entry.summary,
      }),
    );
  }
  const parts = [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kind, count]) => `${kind} × ${count}`);
  return {
    body: `回顾窗口共 ${weekHistory.length} 条结构变更：${parts.join("；")}。`,
    citationKeys: [...new Set(keys)],
  };
}

function buildNewConceptsSection(
  graph: BrainGraphSnapshot,
  weekHistory: GraphHistoryEntry[],
  citations: Map<string, WeeklyBrainReviewCitation>,
): Pick<WeeklyBrainReviewSection, "body" | "citationKeys"> {
  const createEntries = weekHistory.filter((entry) => entry.kind === "create");
  if (createEntries.length === 0) {
    return { body: "回顾窗口内无新增概念节点。", citationKeys: [] };
  }
  const keys: string[] = [];
  const lines = createEntries.map((entry) => {
    const nodeId =
      entry.affectedNodeIds[0] ??
      entry.after.nodes.find(
        (node) => !entry.before.nodes.some((before) => before.id === node.id),
      )?.id;
    if (nodeId) {
      keys.push(
        addCitation(citations, {
          type: "node",
          id: nodeId,
          label: nodeTitle(graph, nodeId),
        }),
      );
    }
    keys.push(
      addCitation(citations, {
        type: "historyEntry",
        id: entry.id,
        label: entry.summary,
      }),
    );
    return `· ${entry.summary}`;
  });
  return {
    body: lines.join("\n"),
    citationKeys: [...new Set(keys)],
  };
}

function buildMergedArchivedSection(
  graph: BrainGraphSnapshot,
  weekHistory: GraphHistoryEntry[],
  citations: Map<string, WeeklyBrainReviewCitation>,
): Pick<WeeklyBrainReviewSection, "body" | "citationKeys"> | null {
  const entries = weekHistory.filter(
    (entry) => entry.kind === "merge" || entry.kind === "archive",
  );
  if (entries.length === 0) {
    return null;
  }
  const keys: string[] = [];
  const lines = entries.map((entry) => {
    keys.push(
      addCitation(citations, {
        type: "historyEntry",
        id: entry.id,
        label: entry.summary,
      }),
    );
    for (const nodeId of entry.affectedNodeIds) {
      if (graph.nodes.some((node) => node.id === nodeId)) {
        keys.push(
          addCitation(citations, {
            type: "node",
            id: nodeId,
            label: nodeTitle(graph, nodeId),
          }),
        );
      }
    }
    const kindLabel = entry.kind === "merge" ? "合并" : "归档";
    return `· [${kindLabel}] ${entry.summary} — ${entry.reasonDetail}`;
  });
  return {
    body: lines.join("\n"),
    citationKeys: [...new Set(keys)],
  };
}

function buildLearningSection(
  weekTraces: LearningTrace[],
  citations: Map<string, WeeklyBrainReviewCitation>,
): Pick<WeeklyBrainReviewSection, "body" | "citationKeys"> | null {
  if (weekTraces.length === 0) {
    return null;
  }
  const keys: string[] = [];
  const lines = weekTraces.map((trace) => {
    keys.push(
      addCitation(citations, {
        type: "trace",
        id: trace.id,
        label: TRACE_KIND_LABEL[trace.kind],
      }),
    );
    const conceptLabel = trace.conceptRef.startsWith("pending:")
      ? trace.conceptRef.slice("pending:".length)
      : trace.conceptRef;
    return `· ${TRACE_KIND_LABEL[trace.kind]}：${conceptLabel}`;
  });
  return {
    body: lines.join("\n"),
    citationKeys: [...new Set(keys)],
  };
}

function buildWeakSpotsSection(
  graph: BrainGraphSnapshot,
  profile: UserProfile,
  citations: Map<string, WeeklyBrainReviewCitation>,
): Pick<WeeklyBrainReviewSection, "body" | "citationKeys"> | null {
  const weakIds = weakConceptIds(profile).filter((id) =>
    graph.nodes.some((node) => node.id === id && !node.archived),
  );
  if (weakIds.length === 0) {
    return null;
  }
  const keys: string[] = [];
  const lines = weakIds.map((nodeId) => {
    keys.push(
      addCitation(citations, {
        type: "node",
        id: nodeId,
        label: nodeTitle(graph, nodeId),
      }),
    );
    return `· ${nodeTitle(graph, nodeId)}（待加强）`;
  });
  return {
    body: lines.join("\n"),
    citationKeys: keys,
  };
}

function buildNextStepsSection(
  graph: BrainGraphSnapshot,
  weekHistory: GraphHistoryEntry[],
  profile: UserProfile,
  citations: Map<string, WeeklyBrainReviewCitation>,
): Pick<WeeklyBrainReviewSection, "body" | "citationKeys"> {
  const suggestions: string[] = [];
  const keys: string[] = [];

  const weakIds = weakConceptIds(profile).filter((id) =>
    graph.nodes.some((node) => node.id === id && !node.archived),
  );
  if (weakIds.length > 0) {
    const focus = nodeTitle(graph, weakIds[0]!);
    suggestions.push(`建议复习「${focus}」并做一次语音追问（Suggest，不会自动改图谱）。`);
    keys.push(
      addCitation(citations, {
        type: "node",
        id: weakIds[0]!,
        label: focus,
      }),
    );
  }

  const ingestCreates = weekHistory.filter((entry) => entry.kind === "create");
  if (ingestCreates.length > 0) {
    const latest = ingestCreates[ingestCreates.length - 1]!;
    const nodeId = latest.affectedNodeIds[0];
    if (nodeId) {
      suggestions.push(
        `本周新入库的概念可连到现有星图簇；可在语音里说「讲讲 ${nodeTitle(graph, nodeId)}」。`,
      );
      keys.push(
        addCitation(citations, {
          type: "node",
          id: nodeId,
          label: nodeTitle(graph, nodeId),
        }),
      );
    }
  }

  if (suggestions.length === 0) {
    suggestions.push(
      "本周变更较少，建议浏览每日简报并挑选 1 条确认入库（需语音确认，不会自动写入）。",
    );
  }

  return {
    body: suggestions.map((line) => `· ${line}`).join("\n"),
    citationKeys: [...new Set(keys)],
  };
}

function assembleMarkdown(
  weekId: string,
  sections: WeeklyBrainReviewSection[],
): string {
  const lines = [`# 每周脑图回顾 · ${weekId}`, ""];
  for (const section of sections) {
    lines.push(`## ${section.title}`, "", section.body, "");
  }
  lines.push(
    "_本报告仅只读汇总历史与画像信号；下一步为建议，不会自动改图谱。_",
  );
  return lines.join("\n").trim();
}

/** Deterministic weekly review from graph history + traces + profile (no LLM). */
export function buildWeeklyBrainReview(
  input: BuildWeeklyBrainReviewInput,
): WeeklyBrainReview {
  const weekHistory = filterWeekHistory(input.history, input.weekRange);
  const weekTraces = filterWeekTraces(input.traces, input.weekRange);
  const citations = new Map<string, WeeklyBrainReviewCitation>();
  const sections: WeeklyBrainReviewSection[] = [];

  const graphChanges = buildGraphChangesSection(weekHistory, citations);
  sections.push({
    kind: "graph_changes",
    title: SECTION_TITLES.graph_changes,
    ...graphChanges,
  });

  const newConcepts = buildNewConceptsSection(
    input.graph,
    weekHistory,
    citations,
  );
  sections.push({
    kind: "new_concepts",
    title: SECTION_TITLES.new_concepts,
    ...newConcepts,
  });

  const mergedArchived = buildMergedArchivedSection(
    input.graph,
    weekHistory,
    citations,
  );
  if (mergedArchived) {
    sections.push({
      kind: "merged_archived",
      title: SECTION_TITLES.merged_archived,
      ...mergedArchived,
    });
  }

  const learning = buildLearningSection(weekTraces, citations);
  if (learning) {
    sections.push({
      kind: "learning_activity",
      title: SECTION_TITLES.learning_activity,
      ...learning,
    });
  }

  const weakSpots = buildWeakSpotsSection(input.graph, input.profile, citations);
  if (weakSpots) {
    sections.push({
      kind: "weak_spots",
      title: SECTION_TITLES.weak_spots,
      ...weakSpots,
    });
  }

  const nextSteps = buildNextStepsSection(
    input.graph,
    weekHistory,
    input.profile,
    citations,
  );
  sections.push({
    kind: "next_steps",
    title: SECTION_TITLES.next_steps,
    ...nextSteps,
  });

  return {
    weekId: input.weekRange.weekId,
    generatedAt: input.generatedAt ?? input.weekRange.end,
    markdown: assembleMarkdown(input.weekRange.weekId, sections),
    sections,
    citations: [...citations.values()].sort((a, b) =>
      citationKey(a.type, a.id).localeCompare(citationKey(b.type, b.id)),
    ),
  };
}

/** Structured snapshot helper for golden tests. */
export function weeklyReviewStructuredSnapshot(review: WeeklyBrainReview): {
  weekId: string;
  sectionKinds: WeeklyBrainReviewSectionKind[];
  sectionTitles: string[];
  citations: Array<{ type: WeeklyBrainReviewCitation["type"]; id: string }>;
} {
  return {
    weekId: review.weekId,
    sectionKinds: review.sections.map((section) => section.kind),
    sectionTitles: review.sections.map((section) => section.title),
    citations: review.citations.map((citation) => ({
      type: citation.type,
      id: citation.id,
    })),
  };
}

export function weeklyReviewMatchesGolden(
  review: WeeklyBrainReview,
  golden: typeof import("@/cognitive/weeklyReviewGolden").WEEKLY_REVIEW_GOLDEN,
): boolean {
  const snapshot = weeklyReviewStructuredSnapshot(review);
  if (snapshot.weekId !== golden.weekId) {
    return false;
  }
  if (snapshot.sectionKinds.join("|") !== golden.sectionKinds.join("|")) {
    return false;
  }
  if (snapshot.sectionTitles.join("|") !== golden.sectionTitles.join("|")) {
    return false;
  }
  for (const required of golden.citations) {
    if (
      !snapshot.citations.some(
        (citation) => citation.type === required.type && citation.id === required.id,
      )
    ) {
      return false;
    }
  }
  for (const entry of golden.mergeArchiveHistoryEntryIds) {
    const section = review.sections.find((s) => s.kind === "merged_archived");
    if (!section?.citationKeys.includes(citationKey("historyEntry", entry))) {
      return false;
    }
  }
  return true;
}
