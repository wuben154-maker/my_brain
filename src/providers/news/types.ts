import type { NewsFetchResult, NewsItem } from "@/domain/news";

export interface NewsSource {
  readonly id: string;
  readonly label: string;
  fetchLatest(): Promise<NewsFetchResult>;
}

export interface NewsSourceRegistry {
  list(): NewsSource[];
  fetchAll(): Promise<NewsFetchResult[]>;
}

export function createNewsSourceRegistry(sources: NewsSource[]): NewsSourceRegistry {
  return {
    list: () => sources,
    async fetchAll() {
      return Promise.all(sources.map((source) => source.fetchLatest()));
    },
  };
}

export function flattenNewsItems(results: NewsFetchResult[]): NewsItem[] {
  return results.flatMap((result) => result.items);
}
