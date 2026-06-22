import { RadarFetchError, type RadarFetch } from "./radarFetch.js";
import type { RadarHeadline } from "./radarHeadline.js";

export const GITHUB_TRENDING_SOURCE_ID = "github-trending";

export const GITHUB_TRENDING_SEARCH_URL =
  "https://api.github.com/search/repositories?q=stars:>10000&sort=updated&order=desc&per_page=5";

interface GitHubSearchRepo {
  id: number;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  updated_at: string;
}

export async function fetchGitHubTrendingHeadlines(
  radarFetch: RadarFetch,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<RadarHeadline[]> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const signal = options.signal ?? controller.signal;

  try {
    const response = await radarFetch(GITHUB_TRENDING_SEARCH_URL, {
      signal,
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "my-brain-radar",
      },
    });

    if (!response.ok) {
      throw new RadarFetchError(
        "HTTP_ERROR",
        `GitHub trending fetch failed: HTTP ${response.status}`,
        response.status,
      );
    }

    const body = (await response.json()) as { items?: GitHubSearchRepo[] };
    const repos = body.items ?? [];
    if (repos.length === 0) {
      throw new RadarFetchError("EMPTY_RESPONSE", "GitHub trending returned no repositories");
    }

    return repos.map((repo) => ({
      id: `gh-${repo.id}`,
      title: repo.full_name,
      summary:
        repo.description?.trim() ||
        `GitHub repository with ${repo.stargazers_count.toLocaleString()} stars.`,
      sourceUrl: repo.html_url,
      sourceKind: "github" as const,
      sourceId: GITHUB_TRENDING_SOURCE_ID,
      publishedAt: repo.updated_at,
    }));
  } catch (error) {
    if (error instanceof RadarFetchError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new RadarFetchError("NETWORK_ERROR", "GitHub trending fetch timed out");
    }
    throw new RadarFetchError(
      "NETWORK_ERROR",
      error instanceof Error ? error.message : "GitHub trending network failure",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
