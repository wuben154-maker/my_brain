export type NewsCategory = "ai_news" | "github_trending";

export interface NewsItem {
  id: string;
  category: NewsCategory;
  title: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string | null;
}

export interface NewsFetchResult {
  sourceId: string;
  items: NewsItem[];
  fetchedAt: string;
}
