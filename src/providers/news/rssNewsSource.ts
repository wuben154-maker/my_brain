import type { NewsFetchResult } from "@/domain/news";
import type { NewsSource } from "./types";

/** RSS fetcher skeleton — wire real feeds in a follow-up PR. */
export class RssNewsSource implements NewsSource {
  readonly id = "rss-ai-feeds";
  readonly label = "AI 权威 RSS";

  constructor(private readonly feedUrls: string[] = []) {}

  async fetchLatest(): Promise<NewsFetchResult> {
    return {
      sourceId: this.id,
      fetchedAt: new Date().toISOString(),
      items: this.feedUrls.length
        ? []
        : [
            {
              id: "demo-rss-1",
              category: "ai_news",
              title: "示例：大模型上下文窗口继续扩展",
              summary: "占位资讯，用于验证加载动画与语音讲解流程。",
              sourceName: "Demo RSS",
              sourceUrl: "https://example.com/ai-context-window",
              publishedAt: new Date().toISOString(),
            },
          ],
    };
  }
}
