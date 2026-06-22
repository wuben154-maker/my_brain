import { describe, expect, it } from "vitest";

import type { UserModeProfile } from "../domain/userMode.js";
import { parseStructuredJsonResponse } from "../providers/structuredJsonParse.js";
import type { LlmProvider } from "../providers/types.js";
import { createMockLlmProvider } from "../providers/mockFactories.js";
import { inferUserModeProfileFromDialogue } from "./adaptiveRadar.js";
import { fetchGitHubTrendingHeadlines, GITHUB_TRENDING_SEARCH_URL } from "./githubTrendingSource.js";
import { fetchLiveRadarSignals } from "./liveRadar.js";
import type { RadarFetch } from "./radarFetch.js";
import {
  scoreRadarHeadlinesWithLlm,
  validateRadarRelevanceBatch,
  type RadarRelevanceBatch,
} from "./radarRelevanceScoring.js";
import { fetchRssRadarHeadlines } from "./rssRadarSource.js";
import type { RadarHeadline } from "./radarHeadline.js";

const TECH_PROFILE: UserModeProfile = inferUserModeProfileFromDialogue(
  [],
  "cold-tech-tracker",
);

type CapturedRequest = { url: string; init?: Parameters<RadarFetch>[1] };

function mockRadarFetchFromHandler(
  handler: (request: CapturedRequest) => {
    ok: boolean;
    status: number;
    body?: unknown;
    text?: string;
  },
): { fetch: RadarFetch; requests: CapturedRequest[] } {
  const requests: CapturedRequest[] = [];
  const fetchImpl: RadarFetch = async (url, init) => {
    requests.push({ url, init });
    const response = handler({ url, init });
    const textBody =
      response.text ??
      (response.body === undefined ? "" : JSON.stringify(response.body));
    return {
      ok: response.ok,
      status: response.status,
      text: async () => textBody,
      json: async () =>
        response.body ??
        (textBody ? (JSON.parse(textBody) as unknown) : ({} as unknown)),
    };
  };
  return { fetch: fetchImpl, requests };
}

const SAMPLE_GITHUB_BODY = {
  items: [
    {
      id: 101,
      full_name: "org/live-agent",
      description: "Agent framework for realtime apps",
      html_url: "https://github.com/org/live-agent",
      stargazers_count: 12000,
      updated_at: "2026-06-18T08:00:00Z",
    },
    {
      id: 102,
      full_name: "org/vector-db",
      description: null,
      html_url: "https://github.com/org/vector-db",
      stargazers_count: 8000,
      updated_at: "2026-06-17T12:00:00Z",
    },
  ],
};

const SAMPLE_RSS_XML = `<?xml version="1.0"?>
<rss><channel>
<item>
<title>LLM Agents in Production</title>
<link>https://example.com/llm-agents</link>
<description>How teams ship agent workflows.</description>
</item>
</channel></rss>`;

function createScoringLlmProvider(batch: RadarRelevanceBatch): LlmProvider {
  return {
    id: "test-scoring-llm",
    async summarize(text: string) {
      return text;
    },
    async explain(topic: string) {
      return topic;
    },
    async generateStructuredJson(request) {
      const raw = JSON.stringify(batch);
      return parseStructuredJsonResponse(raw, request);
    },
    async testConnection() {
      return { status: "connected" };
    },
  };
}

function createMalformedScoringLlmProvider(): LlmProvider {
  return {
    id: "test-malformed-llm",
    async summarize(text: string) {
      return text;
    },
    async explain(topic: string) {
      return topic;
    },
    async generateStructuredJson(request) {
      return parseStructuredJsonResponse(
        JSON.stringify({ scores: [{ headlineId: "x", relevance: 2, explanation: "", suggestedIntent: "nope" }] }),
        request,
      );
    },
    async testConnection() {
      return { status: "connected" };
    },
  };
}

describe("fetchGitHubTrendingHeadlines", () => {
  it("maps successful GitHub API response to radar headlines", async () => {
    const { fetch, requests } = mockRadarFetchFromHandler(({ url }) => {
      expect(url).toBe(GITHUB_TRENDING_SEARCH_URL);
      return { ok: true, status: 200, body: SAMPLE_GITHUB_BODY };
    });

    const headlines = await fetchGitHubTrendingHeadlines(fetch);
    expect(requests).toHaveLength(1);
    expect(headlines).toHaveLength(2);
    expect(headlines[0]?.sourceKind).toBe("github");
    expect(headlines[0]?.title).toBe("org/live-agent");
  });
});

describe("fetchRssRadarHeadlines", () => {
  it("maps successful RSS response to radar headlines", async () => {
    const { fetch } = mockRadarFetchFromHandler(() => ({
      ok: true,
      status: 200,
      text: SAMPLE_RSS_XML,
    }));

    const headlines = await fetchRssRadarHeadlines(fetch, "https://example.com/feed.xml");
    expect(headlines).toHaveLength(1);
    expect(headlines[0]?.sourceKind).toBe("rss");
    expect(headlines[0]?.title).toBe("LLM Agents in Production");
  });
});

describe("scoreRadarHeadlinesWithLlm", () => {
  const headlines: RadarHeadline[] = [
    {
      id: "gh-101",
      title: "org/live-agent",
      summary: "Agent framework",
      sourceUrl: "https://github.com/org/live-agent",
      sourceKind: "github",
      sourceId: "github-trending",
      publishedAt: "2026-06-18T08:00:00Z",
    },
  ];

  it("accepts valid structured LLM scoring output", async () => {
    const llm = createScoringLlmProvider({
      scores: [
        {
          headlineId: "gh-101",
          relevance: 0.91,
          explanation: "Matches AI tracking intent",
          suggestedIntent: "explain_more",
        },
      ],
    });

    const result = await scoreRadarHeadlinesWithLlm(llm, headlines, TECH_PROFILE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scores[0]?.relevance).toBe(0.91);
    }
  });

  it("rejects malformed LLM scoring output", async () => {
    const llm = createMalformedScoringLlmProvider();
    const result = await scoreRadarHeadlinesWithLlm(llm, headlines, TECH_PROFILE);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("PARSE_ERROR");
    }
  });

  it("validator rejects invalid batch shape", () => {
    expect(validateRadarRelevanceBatch({ scores: [] })).toBe(true);
    expect(validateRadarRelevanceBatch({ scores: [{ bad: true }] })).toBe(false);
    expect(createMockLlmProvider().generateStructuredJson).toBeDefined();
  });
});

describe("fetchLiveRadarSignals", () => {
  it("offline or no-key mode returns fixture signals", async () => {
    const { fetch } = mockRadarFetchFromHandler(() => ({
      ok: false,
      status: 500,
      text: "should not be called",
    }));

    const result = await fetchLiveRadarSignals({
      fetch,
      llm: createMockLlmProvider(),
      profile: TECH_PROFILE,
      liveEnabled: false,
    });

    expect(result.mode).toBe("mock");
    expect(result.sourceKind).toBe("fixture");
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.signals[0]?.evidenceRefs[0]).toMatch(/^fixture:/);
    expect(result.degradedReasons.some((r) => r.includes("offline_or_no_key"))).toBe(true);
  });

  it("live GitHub fetch success returns AdaptiveSignal with evidence refs and source type", async () => {
    const { fetch } = mockRadarFetchFromHandler(({ url }) => {
      if (url.includes("api.github.com")) {
        return { ok: true, status: 200, body: SAMPLE_GITHUB_BODY };
      }
      return { ok: false, status: 404, text: "not found" };
    });

    const llm = createScoringLlmProvider({
      scores: [
        {
          headlineId: "gh-101",
          relevance: 0.88,
          explanation: "Strong AI agent match",
          suggestedIntent: "explain_more",
        },
        {
          headlineId: "gh-102",
          relevance: 0.72,
          explanation: "Vector DB relevance",
          suggestedIntent: "ingest_candidate",
        },
      ],
    });

    const result = await fetchLiveRadarSignals({
      fetch,
      llm,
      profile: TECH_PROFILE,
      liveEnabled: true,
    });

    expect(result.mode).toBe("live");
    expect(result.sourceKind).toBe("live");
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.signals[0]?.sourceType).toBe("radar");
    expect(result.signals[0]?.evidenceRefs.some((ref) => ref.startsWith("radar:github:"))).toBe(
      true,
    );
    expect(result.signals[0]?.confidence).toBeGreaterThan(0);
  });

  it("fetch failure falls back to fixture signals with degraded reason", async () => {
    const { fetch } = mockRadarFetchFromHandler(() => ({
      ok: false,
      status: 429,
      text: "rate limited",
    }));

    const result = await fetchLiveRadarSignals({
      fetch,
      llm: createMockLlmProvider(),
      profile: TECH_PROFILE,
      liveEnabled: true,
    });

    expect(result.mode).toBe("degraded");
    expect(result.sourceKind).toBe("fixture");
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.signals[0]?.evidenceRefs[0]).toMatch(/^fixture:/);
    expect(result.degradedReasons.some((r) => r.includes("rate_limited"))).toBe(true);
  });

  it("malformed LLM output keeps live headlines but marks degraded", async () => {
    const { fetch } = mockRadarFetchFromHandler(() => ({
      ok: true,
      status: 200,
      body: SAMPLE_GITHUB_BODY,
    }));

    const result = await fetchLiveRadarSignals({
      fetch,
      llm: createMalformedScoringLlmProvider(),
      profile: TECH_PROFILE,
      liveEnabled: true,
    });

    expect(result.mode).toBe("degraded");
    expect(result.sourceKind).toBe("live");
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.signals[0]?.evidenceRefs.some((ref) => ref.startsWith("radar:github:"))).toBe(
      true,
    );
    expect(result.degradedReasons.some((r) => r.includes("llm_scoring"))).toBe(true);
  });
});
