import type { NewsFetchResult } from "@/domain/news";
import type { NewsSource } from "./types";

/** GitHub trending by star velocity — skeleton only. */
export class GitHubTrendingNewsSource implements NewsSource {
  readonly id = "github-trending";
  readonly label = "GitHub 趋势";

  async fetchLatest(): Promise<NewsFetchResult> {
    return {
      sourceId: this.id,
      fetchedAt: new Date().toISOString(),
      items: [
        {
          id: "demo-gh-1",
          category: "github_trending",
          title: "示例：agent-framework-starter",
          summary: "占位 GitHub 项目，用于验证 star 增速筛选流程。",
          sourceName: "GitHub",
          sourceUrl: "https://github.com/example/agent-framework-starter",
          publishedAt: null,
        },
      ],
    };
  }
}
