import type { NewsItem } from "@/domain/news";
import type { UserProfile } from "@/domain/profile";

/** Recency ordering used before C1 profile scoring and for cold-start fallback. */
export function sortNewsForBrief(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => compareRecency(a, b));
}

export interface NewsScore {
  item: NewsItem;
  score: number;
  reasons: string[];
}

function haystackForItem(item: NewsItem): string {
  return `${item.title} ${item.summary}`.toLowerCase();
}

function topicMatches(haystack: string, topic: string): boolean {
  const needle = topic.trim().toLowerCase();
  if (!needle) {
    return false;
  }
  return haystack.includes(needle);
}

function isColdStartProfile(profile: UserProfile): boolean {
  return (
    profile.interests.length === 0 &&
    profile.knownTopics.length === 0 &&
    profile.unknownTopics.length === 0
  );
}

function recencyKey(item: NewsItem): number {
  return item.publishedAt ? Date.parse(item.publishedAt) : 0;
}

export function compareRecency(a: NewsItem, b: NewsItem): number {
  const delta = recencyKey(b) - recencyKey(a);
  if (delta !== 0) {
    return delta;
  }
  return a.sourceName.localeCompare(b.sourceName, "zh-CN");
}

/** Profile-weighted scores; cold start degrades to recency/source ordering. */
export function scoreNewsByProfile(
  news: NewsItem[],
  profile: UserProfile,
): NewsScore[] {
  if (isColdStartProfile(profile)) {
    return sortNewsForBrief(news).map((item, index) => ({
      item,
      score: news.length - index,
      reasons: ["冷启动：按发布时间与来源排序"],
    }));
  }

  return news.map((item) => {
    const haystack = haystackForItem(item);
    let score = 0;
    const reasons: string[] = [];

    for (const interest of profile.interests) {
      if (topicMatches(haystack, interest)) {
        score += 3;
        reasons.push(`命中兴趣「${interest}」`);
      }
    }
    for (const unknown of profile.unknownTopics) {
      if (topicMatches(haystack, unknown)) {
        score += 4;
        reasons.push(`命中想学「${unknown}」`);
      }
    }
    for (const known of profile.knownTopics) {
      if (topicMatches(haystack, known)) {
        score -= 2;
        reasons.push(`已知主题「${known}」降权`);
      }
    }

    if (reasons.length === 0) {
      reasons.push("未命中画像标签");
    }

    return { item, score, reasons };
  });
}

function sortScoredNews(scored: NewsScore[]): NewsScore[] {
  return [...scored].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return compareRecency(a.item, b.item);
  });
}

/**
 * Pick topN with one exploration slot for a low-score but recent item (anti filter-bubble).
 */
export function selectTopNewsByProfile(
  news: NewsItem[],
  profile: UserProfile,
  topN: number,
): NewsItem[] {
  if (topN <= 0 || news.length === 0) {
    return [];
  }

  const scored = sortScoredNews(scoreNewsByProfile(news, profile));
  if (scored.length <= topN) {
    return scored.map((row) => row.item);
  }

  const reserveExplore = topN >= 2;
  const primaryCount = reserveExplore ? topN - 1 : topN;
  const primary = scored.slice(0, primaryCount);
  const usedIds = new Set(primary.map((row) => row.item.id));

  if (!reserveExplore) {
    return primary.map((row) => row.item);
  }

  const exploreCandidates = scored.filter((row) => !usedIds.has(row.item.id));
  const explorePick =
    [...exploreCandidates]
      .filter((row) => row.score <= 0)
      .sort((a, b) => compareRecency(a.item, b.item))[0] ??
    exploreCandidates[exploreCandidates.length - 1];

  return [...primary.map((row) => row.item), explorePick.item];
}
