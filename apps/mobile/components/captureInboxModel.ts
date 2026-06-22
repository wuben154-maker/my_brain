import type { ProvisionalCandidate, ProvisionalSourceType } from "@my-brain/core";
import { formatCandidateTypeLabel } from "@my-brain/core";

/** Inbox section ids — aligned with 05-capture-inbox.png grouping labels. */
export type CaptureInboxGroupId =
  | "quick_note"
  | "link"
  | "share"
  | "screenshot_ocr"
  | "voice_note";

export type CapturePrivacyLevel = "local_only" | "needs_review" | "no_export";

export interface CaptureInboxRowViewModel {
  id: string;
  candidate: ProvisionalCandidate;
  groupId: CaptureInboxGroupId;
  sourceLabel: string;
  timeLabel: string;
  privacyLevel: CapturePrivacyLevel;
  privacyLabel: string;
  title: string;
  whyMaybe: string;
  assetTypeLabel: string;
  accentMode: "accent" | "primary" | "warning";
}

export interface CaptureInboxSectionViewModel {
  groupId: CaptureInboxGroupId;
  title: string;
  rows: CaptureInboxRowViewModel[];
}

export const CAPTURE_INBOX_GROUP_ORDER: CaptureInboxGroupId[] = [
  "quick_note",
  "link",
  "share",
  "screenshot_ocr",
  "voice_note",
];

export const CAPTURE_INBOX_GROUP_LABELS: Record<CaptureInboxGroupId, string> = {
  quick_note: "随手记",
  link: "链接",
  share: "分享",
  screenshot_ocr: "截图·OCR",
  voice_note: "语音笔记",
};

export const CAPTURE_INBOX_EMPTY_COPY =
  "星尘 inbox 还是空的。随手记一句、丢个链接，或从分享入口送进来，都会先在这里等你点亮。";

export const CAPTURE_INBOX_FILTER_CHIPS: Array<{
  id: "all" | CaptureInboxGroupId;
  label: string;
}> = [
  { id: "all", label: "全部" },
  { id: "link", label: "链接" },
  { id: "voice_note", label: "语音" },
  { id: "screenshot_ocr", label: "OCR" },
];

const SOURCE_TYPE_LABELS: Record<ProvisionalSourceType, string> = {
  text: "随手记",
  link: "链接",
  learning: "学习",
  project: "项目",
  life: "生活",
  image_mock: "截图 OCR",
  voice_note_mock: "语音笔记",
};

function resolveInboxGroup(candidate: ProvisionalCandidate): CaptureInboxGroupId {
  if (candidate.sourceType === "image_mock") {
    return "screenshot_ocr";
  }
  if (candidate.sourceType === "voice_note_mock") {
    return "voice_note";
  }
  if (candidate.sourceType === "link") {
    const fromShare =
      candidate.ingestSource === "share" ||
      candidate.evidenceRefs.some((ref) => /share|intent|app-group/i.test(ref));
    return fromShare ? "share" : "link";
  }
  return "quick_note";
}

function resolvePrivacy(candidate: ProvisionalCandidate): {
  level: CapturePrivacyLevel;
  label: string;
} {
  if (candidate.sourceType === "image_mock") {
    return { level: "needs_review", label: "需确认" };
  }
  if (candidate.ssrfRejectCode) {
    return { level: "needs_review", label: "需确认" };
  }
  if (candidate.ingestSource === "provisional_pending") {
    return { level: "local_only", label: "仅本地" };
  }
  return { level: "local_only", label: "仅本地" };
}

function resolveAccent(groupId: CaptureInboxGroupId): CaptureInboxRowViewModel["accentMode"] {
  if (groupId === "share") {
    return "accent";
  }
  if (groupId === "screenshot_ocr") {
    return "warning";
  }
  if (groupId === "quick_note") {
    return "accent";
  }
  return "primary";
}

function buildWhyMaybe(candidate: ProvisionalCandidate, groupId: CaptureInboxGroupId): string {
  if (candidate.sourceType === "image_mock") {
    return "先预览原图，不自动写入图谱。";
  }
  if (candidate.ssrfRejectCode) {
    return "链接未通过安全校验，确认前不会抓取正文。";
  }
  if (groupId === "share") {
    return "可能关联：长期记忆、图谱整理、时间线回放。";
  }
  if (candidate.sourceType === "learning" || candidate.sourceType === "project") {
    return "建议先放入项目表达素材。";
  }
  if (candidate.sourceType === "voice_note_mock") {
    return "语音路径演示中；文字确认前不会入库。";
  }
  if (candidate.linkUrl && candidate.fetchOk) {
    return "链接已校验（mock），等你决定是否点亮。";
  }
  return "确认前不会进入永久星图，你可以先放着或丢掉。";
}

function formatRelativeTime(createdAt: string): string {
  const created = new Date(createdAt);
  const now = Date.now();
  const diffMs = now - created.getTime();
  if (diffMs < 0) {
    return "刚刚";
  }
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) {
    return "刚刚";
  }
  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const hh = created.getHours();
    const mm = String(created.getMinutes()).padStart(2, "0");
    return `今天 ${hh}:${mm}`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) {
    return "昨天";
  }
  return `${days} 天前`;
}

export function buildCaptureInboxRowViewModel(
  candidate: ProvisionalCandidate,
): CaptureInboxRowViewModel {
  const groupId = resolveInboxGroup(candidate);
  const privacy = resolvePrivacy(candidate);
  const sourceLabel = SOURCE_TYPE_LABELS[candidate.sourceType] ?? candidate.sourceType;

  return {
    id: candidate.id,
    candidate,
    groupId,
    sourceLabel,
    timeLabel: formatRelativeTime(candidate.createdAt),
    privacyLevel: privacy.level,
    privacyLabel: privacy.label,
    title: candidate.summary,
    whyMaybe: buildWhyMaybe(candidate, groupId),
    assetTypeLabel: formatCandidateTypeLabel(candidate),
    accentMode: resolveAccent(groupId),
  };
}

export function buildCaptureInboxSections(
  candidates: ProvisionalCandidate[],
): CaptureInboxSectionViewModel[] {
  const pending = candidates.filter(
    (c) => c.status === "pending" || c.status === "explaining",
  );
  const rows = pending.map(buildCaptureInboxRowViewModel);

  return CAPTURE_INBOX_GROUP_ORDER.map((groupId) => ({
    groupId,
    title: CAPTURE_INBOX_GROUP_LABELS[groupId],
    rows: rows.filter((row) => row.groupId === groupId),
  })).filter((section) => section.rows.length > 0);
}

export function proposalFromCandidate(candidate: ProvisionalCandidate): {
  id: string;
  concept: string;
  intro: string;
  sourceLinks: string[];
  createdAt: string;
} {
  return {
    id: `inbox-proposal-${candidate.id}`,
    concept: candidate.summary.slice(0, 48),
    intro: candidate.summary,
    sourceLinks: candidate.linkUrl
      ? [candidate.linkUrl]
      : candidate.evidenceRefs,
    createdAt: candidate.createdAt,
  };
}

/** Deterministic provisional queue for CK-08 CaptureInboxScreen adb capture. */
export const CAPTURE_INBOX_VISUAL_FIXTURE_PENDING_COUNT = 8;

const CAPTURE_INBOX_VISUAL_FIXTURE_CREATED_AT = "2026-06-20T06:00:00.000Z";
const CAPTURE_INBOX_VISUAL_FIXTURE_NOTE_CREATED_AT = "2026-06-20T06:20:00.000Z";

export const CAPTURE_INBOX_VISUAL_FIXTURE_DISPLAY_IDS = [
  "visual-fixture-inbox-share-1",
  "visual-fixture-inbox-note-1",
  "visual-fixture-inbox-ocr-1",
] as const;

const CAPTURE_INBOX_VISUAL_FIXTURE_ROW_OVERRIDES: Record<
  string,
  Pick<CaptureInboxRowViewModel, "sourceLabel" | "timeLabel" | "title" | "whyMaybe" | "accentMode">
> = {
  "visual-fixture-inbox-share-1": {
    sourceLabel: "分享链接",
    timeLabel: "2 分钟前",
    title: "Graphiti 的 episode 机制",
    whyMaybe: "可能关联：长期记忆、图谱整理、时间线回放。",
    accentMode: "accent",
  },
  "visual-fixture-inbox-note-1": {
    sourceLabel: "随手记",
    timeLabel: "今天 14:20",
    title: "面试时要讲清楚为什么不是普通 RAG",
    whyMaybe: "建议先放入项目表达素材。",
    accentMode: "accent",
  },
  "visual-fixture-inbox-ocr-1": {
    sourceLabel: "截图 OCR",
    timeLabel: "需要确认",
    title: "识别到 3 个概念，置信度偏低",
    whyMaybe: "先预览原图，不自动写入图谱。",
    accentMode: "warning",
  },
};

export function seedCaptureInboxVisualFixtureCandidates(): ProvisionalCandidate[] {
  const filler: ProvisionalCandidate[] = Array.from({ length: 5 }, (_, index) => ({
    id: `visual-fixture-inbox-filler-${index + 1}`,
    sourceType: "text",
    summary: `星尘占位 ${index + 1}`,
    evidenceRefs: [],
    createdAt: CAPTURE_INBOX_VISUAL_FIXTURE_CREATED_AT,
    status: "pending",
    ingestSource: "provisional_pending",
  }));

  return [
    {
      id: "visual-fixture-inbox-share-1",
      sourceType: "link",
      summary: "Graphiti 的 episode 机制",
      evidenceRefs: ["share:intent-fixture"],
      createdAt: CAPTURE_INBOX_VISUAL_FIXTURE_CREATED_AT,
      status: "pending",
      linkUrl: "https://example.com/graphiti",
      fetchOk: true,
      ingestSource: "share",
    },
    {
      id: "visual-fixture-inbox-note-1",
      sourceType: "text",
      summary: "面试时要讲清楚为什么不是普通 RAG",
      evidenceRefs: [],
      createdAt: CAPTURE_INBOX_VISUAL_FIXTURE_NOTE_CREATED_AT,
      status: "pending",
    },
    {
      id: "visual-fixture-inbox-ocr-1",
      sourceType: "image_mock",
      summary: "识别到 3 个概念，置信度偏低",
      evidenceRefs: ["image:fixture-ocr"],
      createdAt: CAPTURE_INBOX_VISUAL_FIXTURE_CREATED_AT,
      status: "pending",
    },
    ...filler,
  ];
}

export function buildCaptureInboxVisualFixtureRows(
  candidates: ProvisionalCandidate[],
): CaptureInboxRowViewModel[] {
  const pending = candidates.filter((c) => c.status === "pending" || c.status === "explaining");
  const source =
    pending.length >= CAPTURE_INBOX_VISUAL_FIXTURE_DISPLAY_IDS.length
      ? pending
      : seedCaptureInboxVisualFixtureCandidates();
  const byId = new Map(source.map((c) => [c.id, buildCaptureInboxRowViewModel(c)]));

  return CAPTURE_INBOX_VISUAL_FIXTURE_DISPLAY_IDS.map((id) => {
    const base = byId.get(id);
    if (!base) {
      return buildCaptureInboxRowViewModel(
        seedCaptureInboxVisualFixtureCandidates().find((c) => c.id === id)!,
      );
    }
    const override = CAPTURE_INBOX_VISUAL_FIXTURE_ROW_OVERRIDES[id];
    return override ? { ...base, ...override } : base;
  });
}

export function captureInboxVisualFixturePendingCount(
  candidates: ProvisionalCandidate[],
): number {
  const pending = candidates.filter(
    (c) => c.status === "pending" || c.status === "explaining",
  );
  return pending.length >= CAPTURE_INBOX_VISUAL_FIXTURE_PENDING_COUNT
    ? CAPTURE_INBOX_VISUAL_FIXTURE_PENDING_COUNT
    : pending.length;
}
