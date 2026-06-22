import type {
  AdaptiveSignal,
  GraphRepository,
  HistoryRepository,
  UserMode,
  UserModeProfile,
} from "@my-brain/core";
import { userModeLabel } from "@my-brain/core";

import type { IntentKey } from "../theme/tokens";

export interface TodayEntryViewModel {
  id: string;
  tag: string;
  title: string;
  reasonText: string;
  accentMode: UserMode;
  signalIndex: number | null;
  primaryAction: IntentKey;
}

export const TODAY_PAGE_COPY = {
  title: "今日",
  subtitle: "不是信息流，是今天和你最有关的入口。",
  voiceHint: "问我为什么推荐这条",
  storageNotReady: "本地存储还在准备，今日入口会稍后从已保存数据加载。",
  emptyTitle: "今天还没有专属入口",
  emptyBody: "聊聊、确认入库或整理待点亮星尘后，这里会从雷达与图谱变化里派生推荐。",
} as const;

export const TODAY_CARD_ACTION_LABELS: Record<IntentKey, string> = {
  detail: "继续讲",
  ingest: "记住这条",
  skip: "略过",
};

/** CK-08 ui-04 adb capture — frozen copy from UI/04-today.svg. */
export const TODAY_VISUAL_FIXTURE_ENTRIES: TodayEntryViewModel[] = [
  {
    id: "fixture-today-hero",
    tag: "技术追踪者 · 高相关",
    title: "新模型通道和你的语音伴侣架构有关",
    reasonText: "原因：命中 Provider 抽象、Realtime、成本控制 3 个图谱节点。",
    accentMode: "tech_tracker",
    signalIndex: null,
    primaryAction: "detail",
  },
  {
    id: "fixture-today-resume",
    tag: "继续学习",
    title: "你上次问到 GraphChange，今天可以接上",
    reasonText: "从 undo 历史讲，不重复基础概念。",
    accentMode: "learner",
    signalIndex: null,
    primaryAction: "detail",
  },
  {
    id: "fixture-today-capture",
    tag: "待整理素材",
    title: "2 条分享链接还没决定要不要点亮",
    reasonText: "原因：先在待点亮星尘里看证据，确认前不会自动入库。",
    accentMode: "creator_researcher",
    signalIndex: null,
    primaryAction: "skip",
  },
];

const SOURCE_TYPE_LABELS: Record<AdaptiveSignal["sourceType"], string> = {
  radar: "雷达",
  capture: "捕获",
  learning: "学习",
  project: "项目",
  memory: "记忆",
};

function signalDisplayTitle(signal: AdaptiveSignal): string {
  const urlRef = signal.evidenceRefs.find((ref) => ref.startsWith("url:"));
  if (urlRef) {
    const raw = urlRef.slice("url:".length);
    try {
      const hostname = new URL(raw).hostname.replace(/^www\./, "");
      return hostname || raw.slice(0, 32);
    } catch {
      return raw.slice(0, 32);
    }
  }

  const radarRef = signal.evidenceRefs.find((ref) => ref.startsWith("radar:"));
  if (radarRef) {
    const tail = radarRef.split(":").slice(2).join(":");
    return tail || "雷达推荐";
  }

  return `${SOURCE_TYPE_LABELS[signal.sourceType]} · ${userModeLabel(signal.userModeFit)}`;
}

function signalReasonText(signal: AdaptiveSignal): string {
  const confidence = Math.round(signal.confidence * 100);
  return `原因：与${userModeLabel(signal.userModeFit)}画像匹配（${SOURCE_TYPE_LABELS[signal.sourceType]} · 置信 ${confidence}%）。`;
}

function buildSignalEntries(signals: AdaptiveSignal[]): TodayEntryViewModel[] {
  return signals.slice(0, 2).map((signal, index) => ({
    id: `today-signal-${index}`,
    tag: `${userModeLabel(signal.userModeFit)} · ${SOURCE_TYPE_LABELS[signal.sourceType]}`,
    title: signalDisplayTitle(signal),
    reasonText: signalReasonText(signal),
    accentMode: signal.userModeFit,
    signalIndex: index,
    primaryAction: signal.suggestedIntent === "ingest_candidate" ? "ingest" : "detail",
  }));
}

function buildGraphResumeEntries(
  graph: GraphRepository,
  history: HistoryRepository,
  profile: UserModeProfile,
): TodayEntryViewModel[] {
  const changes = history
    .listChanges()
    .filter((change) => !change.undone)
    .slice()
    .reverse();

  const entries: TodayEntryViewModel[] = [];
  const seenNodeIds = new Set<string>();

  for (const change of changes) {
    const createdNodes = change.after.nodes.filter(
      (node) =>
        !node.archived &&
        !change.before.nodes.some((beforeNode) => beforeNode.id === node.id),
    );

    for (const node of createdNodes) {
      if (seenNodeIds.has(node.id)) {
        continue;
      }
      seenNodeIds.add(node.id);
      entries.push({
        id: `today-graph-${node.id}`,
        tag: "继续跟进",
        title: node.concept,
        reasonText: `原因：${change.summary} — 可以从「${node.concept}」接着聊。`,
        accentMode: profile.primaryMode,
        signalIndex: null,
        primaryAction: "detail",
      });
    }
  }

  return entries;
}

function buildCapturePendingEntry(pendingCaptureCount: number): TodayEntryViewModel | null {
  if (pendingCaptureCount <= 0) {
    return null;
  }

  return {
    id: "today-capture-pending",
    tag: "待整理素材",
    title: `${pendingCaptureCount} 条分享链接还没决定要不要点亮`,
    reasonText: "原因：先在待点亮星尘里看证据，确认前不会自动入库。",
    accentMode: "creator_researcher",
    signalIndex: null,
    primaryAction: "skip",
  };
}

/** Storage/graph/history-backed Today list — not a briefing feed; each row carries an explicit reason. */
export function buildTodayEntryViewModels(
  profile: UserModeProfile | null,
  signals: AdaptiveSignal[],
  pendingCaptureCount = 0,
  graph?: GraphRepository,
  history?: HistoryRepository,
): TodayEntryViewModel[] {
  if (!profile) {
    return [];
  }

  const entries: TodayEntryViewModel[] = [
    ...buildSignalEntries(signals),
    ...(graph && history ? buildGraphResumeEntries(graph, history, profile) : []),
  ];

  const captureEntry = buildCapturePendingEntry(pendingCaptureCount);
  if (captureEntry) {
    entries.push(captureEntry);
  }

  if (profile.recentIntent) {
    const title = profile.recentIntent.slice(0, 48);
    entries.push({
      id: "today-profile-intent",
      tag: `${userModeLabel(profile.primaryMode)} · 最近意向`,
      title,
      reasonText: `原因：来自最近对话，与${userModeLabel(profile.primaryMode)}画像一致。`,
      accentMode: profile.primaryMode,
      signalIndex: null,
      primaryAction: "detail",
    });
  }

  const seen = new Set<string>();
  return entries
    .filter((entry) => {
      if (seen.has(entry.id)) {
        return false;
      }
      seen.add(entry.id);
      return true;
    })
    .slice(0, 3);
}

export function isTodayStorageEmpty(
  profile: UserModeProfile | null,
  signals: AdaptiveSignal[],
  pendingCaptureCount = 0,
  graph?: GraphRepository,
  history?: HistoryRepository,
): boolean {
  return (
    buildTodayEntryViewModels(
      profile,
      signals,
      pendingCaptureCount,
      graph,
      history,
    ).length === 0
  );
}
