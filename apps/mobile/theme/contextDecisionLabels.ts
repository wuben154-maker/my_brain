import type { IntentKey } from "./tokens";

/** Bar / sheet copy variants per S10 spec — zh-CN labels only. */
export type ContextDecisionLabelVariant = "default" | "today" | "inbox" | "sheet" | "node";

export const CONTEXT_DECISION_LABELS: Record<
  ContextDecisionLabelVariant,
  Record<IntentKey, string>
> = {
  default: {
    ingest: "记住这个",
    skip: "先不用",
    detail: "多说点",
  },
  today: {
    ingest: "记住这条",
    skip: "先不用",
    detail: "多说点",
  },
  inbox: {
    ingest: "点亮成星",
    skip: "先放着",
    detail: "整理一下",
  },
  sheet: {
    ingest: "点亮成星",
    skip: "先放着",
    detail: "继续讲",
  },
  node: {
    ingest: "查看详情",
    skip: "整理",
    detail: "继续讲",
  },
};

export const CONTEXT_DECISION_PAGE_COPY = {
  title: "上下文决策",
  subtitle: "三意图保留为安全阀，只在有候选时出现。",
  sheetDisclaimer: "确认前不会写入永久星图",
  evidenceHeading: "为什么推荐",
  voiceSynonymsFooter: "语音同义词：记住 / 不要 / 讲细点",
} as const;

export function labelsForVariant(
  variant: ContextDecisionLabelVariant,
): Record<IntentKey, string> {
  return CONTEXT_DECISION_LABELS[variant];
}
