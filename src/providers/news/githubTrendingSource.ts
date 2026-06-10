import type { NewsCategory, NewsFetchResult } from "@/domain/news";
import { isNewsLiveFetchEnabled } from "./newsLiveFetchMode";
import type { NewsSource } from "./types";

interface GitHubSearchRepo {
  id: number;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  updated_at: string;
}

/** GitHub trending by star velocity — skeleton with optional public API smoke fetch. */
export class GitHubTrendingNewsSource implements NewsSource {
  readonly id = "github-trending";
  readonly label = "GitHub 趋势";

  async fetchLatest(): Promise<NewsFetchResult> {
    if (isNewsLiveFetchEnabled()) {
      try {
        return await fetchGitHubTrendingLiveSmoke();
      } catch (error) {
        console.warn("[GitHubTrendingNewsSource] live fetch failed, using demo items", error);
      }
    }

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

/**
 * Public GitHub Search API smoke fetch — no API key required.
 * Used only by env-gated KP-01 live source smoke tests / manual evidence runs.
 */
export async function fetchGitHubTrendingLiveSmoke(): Promise<NewsFetchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(
      "https://api.github.com/search/repositories?q=stars:>10000&sort=updated&order=desc&per_page=5",
      {
        signal: controller.signal,
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "my-brain-kp01-live-smoke",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`GitHub public API smoke fetch failed: HTTP ${response.status}`);
    }

    const body = (await response.json()) as { items?: GitHubSearchRepo[] };
    const repos = body.items ?? [];
    if (repos.length === 0) {
      throw new Error("GitHub public API smoke fetch returned no repositories");
    }

    return {
      sourceId: "github-trending-live-smoke",
      fetchedAt: new Date().toISOString(),
      items: repos.map((repo) => ({
        id: `gh-live-${repo.id}`,
        category: "github_trending" as NewsCategory,
        title: repo.full_name,
        summary:
          repo.description?.trim() ||
          `GitHub repository with ${repo.stargazers_count.toLocaleString()} stars.`,
        sourceName: "GitHub",
        sourceUrl: repo.html_url,
        publishedAt: repo.updated_at,
      })),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
