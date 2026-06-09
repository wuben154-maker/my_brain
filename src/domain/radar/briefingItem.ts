import type { NewsItem } from "@/domain/news";
import type { RadarSignal } from "@/domain/radar/radarSignal";
import type { WorldItem } from "@/domain/radar/worldItem";
import { projectWorldItemToNewsItem } from "@/radar/worldSources/worldSourceAdapter";

export type BriefingFeedbackKind =
  | "not_interested"
  | "too_shallow"
  | "too_deep"
  | "already_know";

export interface BriefingFeedback {
  kind: BriefingFeedbackKind;
  worldItemId: string;
  at: string;
}

export type BriefingRank = 1 | 2 | 3;

export interface BriefingItem {
  worldItem: WorldItem;
  signals: RadarSignal[];
  briefingRank: BriefingRank;
}

export function briefingItemToNewsItem(item: BriefingItem): NewsItem {
  return projectWorldItemToNewsItem(item.worldItem);
}

export function getBriefingItemNewsId(item: BriefingItem): string {
  return briefingItemToNewsItem(item).id;
}

export function findBriefingItemByNewsId(
  items: BriefingItem[],
  newsId: string,
): BriefingItem | undefined {
  return items.find(
    (item) =>
      item.worldItem.id === newsId || getBriefingItemNewsId(item) === newsId,
  );
}

export function isBriefingFeedbackExcluded(kind: BriefingFeedbackKind): boolean {
  return kind === "not_interested" || kind === "already_know";
}

export function primaryBriefingSignal(item: BriefingItem): RadarSignal | undefined {
  return item.signals[0];
}
