import { describe, expect, it } from "vitest";

import type { LlmProvider, LlmStructuredJsonRequest, RadarFetch } from "@my-brain/core";
import { createMemorySecureCredentialStore } from "../services/secureCredentialStore";
import { resolveMobileRadarSignals } from "./mobileRadarRuntime";

function createRadarFetch(status: number): RadarFetch {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return status >= 200 && status < 300 ? "ok" : "rate limited";
    },
    async json() {
      return {
        items: [
          {
            id: 101,
            full_name: "openai/agents",
            description: "Agent runtime",
            html_url: "https://github.com/openai/agents",
            stargazers_count: 42_000,
            updated_at: "2026-06-19T00:00:00.000Z",
          },
        ],
      };
    },
  });
}

function createScoringLlm(): LlmProvider {
  return {
    id: "test-scoring-llm",
    async summarize(text) {
      return text;
    },
    async explain(topic) {
      return topic;
    },
    async generateStructuredJson<T>(request: LlmStructuredJsonRequest<T>) {
      const value = {
        scores: [
          {
            headlineId: "gh-101",
            relevance: 0.91,
            explanation: "Matches AI agent interests",
            suggestedIntent: "explain_more",
          },
        ],
      };
      if (!request.validate(value)) {
        return {
          ok: false,
          errorCode: "PARSE_ERROR",
          message: "invalid test score",
        };
      }
      return { ok: true, value, raw: JSON.stringify(value) };
    },
    async testConnection() {
      return { status: "connected" };
    },
  };
}

const profile = {
  primaryMode: "tech_tracker",
  secondaryModes: [],
  confidence: 0.9,
  recentIntent: "跟进 AI agents",
} as const;

describe("mobileRadarRuntime", () => {
  it("uses fixture mode when no LLM key is configured", async () => {
    const store = createMemorySecureCredentialStore();
    const result = await resolveMobileRadarSignals({
      profile,
      credentialStore: store,
      radarSettings: { enabledSources: ["github"], fetchIntervalMinutes: 60 },
      fetch: createRadarFetch(200),
    });

    expect(result.providerMode).toBe("mock");
    expect(result.sourceKind).toBe("fixture");
    expect(result.activeCodes).toEqual(["mock_llm", "fixture_radar"]);
    expect(result.signals[0]?.evidenceRefs[0]).toMatch(/^fixture:/);
  });

  it("uses mocked live radar when key and live source are configured", async () => {
    const store = createMemorySecureCredentialStore();
    await store.set("llm_api_key", "sk-test");
    const result = await resolveMobileRadarSignals({
      profile,
      credentialStore: store,
      radarSettings: { enabledSources: ["github"], fetchIntervalMinutes: 60 },
      llmSettings: {
        providerId: "openai",
        model: "gpt-test",
        endpoint: "https://api.openai.test/v1",
      },
      llm: createScoringLlm(),
      fetch: createRadarFetch(200),
    });

    expect(result.providerMode).toBe("live");
    expect(result.sourceKind).toBe("live");
    expect(result.activeCodes).toEqual([]);
    expect(result.signals[0]?.evidenceRefs.some((ref) => ref.startsWith("radar:github:"))).toBe(
      true,
    );
  });

  it("maps live fetch failures to degraded fixture radar", async () => {
    const store = createMemorySecureCredentialStore();
    await store.set("llm_api_key", "sk-test");
    const result = await resolveMobileRadarSignals({
      profile,
      credentialStore: store,
      radarSettings: { enabledSources: ["github"], fetchIntervalMinutes: 60 },
      llmSettings: {
        providerId: "openai",
        model: "gpt-test",
        endpoint: "https://api.openai.test/v1",
      },
      llm: createScoringLlm(),
      fetch: createRadarFetch(429),
    });

    expect(result.providerMode).toBe("degraded");
    expect(result.sourceKind).toBe("fixture");
    expect(result.degradedReasons.some((reason) => reason.includes("rate_limited"))).toBe(true);
    expect(result.signals[0]?.evidenceRefs[0]).toMatch(/^fixture:/);
  });
});
