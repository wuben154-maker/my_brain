import type { NewsCategory, NewsFetchResult, NewsItem } from "@/domain/news";
import {
  normalizeWorldItem,
  type WorldItem,
  type WorldItemKind,
} from "@/domain/radar/worldItem";

export interface NewsToWorldItemOptions {
  id?: string;
  fetchedAt?: string;
  sourceId?: string;
}

export function mapNewsItemToWorldItem(
  item: NewsItem,
  options: NewsToWorldItemOptions = {},
): WorldItem {
  const fetchedAt = options.fetchedAt ?? item.publishedAt ?? new Date(0).toISOString();
  return normalizeWorldItem({
    id: options.id ?? `radar-wi-${item.id}`,
    kind: mapNewsCategoryToWorldItemKind(item.category),
    title: item.title,
    summary: item.summary,
    sourceUrl: item.sourceUrl,
    fetchedAt,
    sourceName: item.sourceName,
    sourceItemId: item.id,
  });
}

export function mapNewsFetchResultToWorldItems(result: NewsFetchResult): WorldItem[] {
  return result.items.map((item) =>
    mapNewsItemToWorldItem(item, {
      fetchedAt: item.publishedAt ?? result.fetchedAt,
      sourceId: result.sourceId,
    }),
  );
}

export function mapNewsResultsToWorldItems(results: NewsFetchResult[]): WorldItem[] {
  return results.flatMap(mapNewsFetchResultToWorldItems);
}

export function projectWorldItemToNewsItem(item: WorldItem): NewsItem {
  return {
    id: item.sourceItemId ?? item.id,
    category: mapWorldItemKindToNewsCategory(item.kind),
    title: item.title,
    summary: item.summary,
    sourceName: item.sourceName ?? "Radar",
    sourceUrl: item.sourceUrl ?? "",
    publishedAt: item.fetchedAt,
  };
}

export function mapNewsCategoryToWorldItemKind(category: NewsCategory): WorldItemKind {
  return category;
}

export function mapWorldItemKindToNewsCategory(kind: WorldItemKind): NewsCategory {
  if (kind === "github_trending") {
    return "github_trending";
  }
  return "ai_news";
}
