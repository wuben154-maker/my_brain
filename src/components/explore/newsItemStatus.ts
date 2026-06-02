import type { NewsItem } from "@/domain/news";

export type NewsItemStatus = "pending" | "ingested" | "skipped";

export function newsItemStatus(
  item: NewsItem,
  ingestedIds: string[],
  skippedIds: string[],
): NewsItemStatus {
  if (ingestedIds.includes(item.id)) {
    return "ingested";
  }
  if (skippedIds.includes(item.id)) {
    return "skipped";
  }
  return "pending";
}

export const NEWS_ITEM_STATUS_LABELS: Record<NewsItemStatus, string> = {
  pending: "待处理",
  ingested: "已入库",
  skipped: "已跳过",
};
