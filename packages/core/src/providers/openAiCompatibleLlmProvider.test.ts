import { describe, expect, it } from "vitest";

import type { LlmFetch } from "./openAiCompatibleClient.js";
import {
  createDeepSeekLlmProvider,
  createOpenAiCompatibleLlmProvider,
  DEFAULT_DEEPSEEK_BASE_URL,
  DEFAULT_DEEPSEEK_MODEL,
  hasLlmApiKey,
} from "./openAiCompatibleLlmProvider.js";
import { isMockStructuredJsonValue } from "./structuredJsonParse.js";

type CapturedRequest = {
  url: string;
  init: Parameters<LlmFetch>[1];
};

function mockFetchFromHandler(
  handler: (request: CapturedRequest) => {
    ok: boolean;
    status: number;
    body?: unknown;
    text?: string;
  },
): { fetch: LlmFetch; requests: CapturedRequest[] } {
  const requests: CapturedRequest[] = [];
  const fetchImpl: LlmFetch = async (url, init) => {
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

function successCompletion(text: string) {
  return {
    ok: true,
    status: 200,
    body: { choices: [{ message: { content: text } }] },
  };
}

describe("hasLlmApiKey", () => {
  it("accepts non-empty keys only", () => {
    expect(hasLlmApiKey("sk-test")).toBe(true);
    expect(hasLlmApiKey("")).toBe(false);
    expect(hasLlmApiKey("   ")).toBe(false);
    expect(hasLlmApiKey(undefined)).toBe(false);
  });
});

describe("OpenAiCompatibleLlmProvider · request shape", () => {
  it("builds chat completion requests with bearer auth and JSON body", async () => {
    const { fetch, requests } = mockFetchFromHandler(() =>
      successCompletion("summary text"),
    );
    const llm = createOpenAiCompatibleLlmProvider({
      apiKey: "sk-live",
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-chat",
      fetch,
    });

    await llm.summarize("Hello world");

    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://api.deepseek.com/chat/completions");
    expect(requests[0]?.init.method).toBe("POST");
    expect(requests[0]?.init.headers.Authorization).toBe("Bearer sk-live");
    expect(requests[0]?.init.headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(requests[0]?.init.body ?? "{}") as {
      model: string;
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.model).toBe("deepseek-chat");
    expect(body.messages.at(-1)?.content).toBe("Hello world");
  });

  it("uses DeepSeek defaults in createDeepSeekLlmProvider", async () => {
    const { fetch, requests } = mockFetchFromHandler(() => successCompletion("pong"));
    const llm = createDeepSeekLlmProvider({
      apiKey: "sk-live",
      fetch,
    });

    await llm.testConnection();

    expect(requests[0]?.url).toBe(`${DEFAULT_DEEPSEEK_BASE_URL}/chat/completions`);
    const body = JSON.parse(requests[0]?.init.body ?? "{}") as { model: string };
    expect(body.model).toBe(DEFAULT_DEEPSEEK_MODEL);
  });

  it("explain sends topic and optional context", async () => {
    const { fetch, requests } = mockFetchFromHandler(() =>
      successCompletion("explanation"),
    );
    const llm = createOpenAiCompatibleLlmProvider({
      apiKey: "sk-live",
      fetch,
    });

    await llm.explain("RAG", "Used in search pipelines");

    const body = JSON.parse(requests[0]?.init.body ?? "{}") as {
      messages: Array<{ content: string }>;
    };
    expect(body.messages.at(-1)?.content).toContain("Topic: RAG");
    expect(body.messages.at(-1)?.content).toContain("Used in search pipelines");
  });

  it("generateStructuredJson validates parsed JSON before success", async () => {
    const { fetch } = mockFetchFromHandler(() =>
      successCompletion('{"mock":true,"prompt":"Score this"}'),
    );
    const llm = createOpenAiCompatibleLlmProvider({
      apiKey: "sk-live",
      fetch,
    });

    const result = await llm.generateStructuredJson({
      prompt: "Score this",
      validate: isMockStructuredJsonValue,
    });
    expect(result.ok).toBe(true);
  });

  it("generateStructuredJson rejects invalid JSON without mutating caller state", async () => {
    const { fetch } = mockFetchFromHandler(() => successCompletion("not-json"));
    const llm = createOpenAiCompatibleLlmProvider({
      apiKey: "sk-live",
      fetch,
    });

    const result = await llm.generateStructuredJson({
      prompt: "Score this",
      validate: isMockStructuredJsonValue,
    });
    expect(result).toEqual({
      ok: false,
      errorCode: "PARSE_ERROR",
      message: "Structured LLM response was not valid JSON",
      raw: "not-json",
    });
  });
});

describe("OpenAiCompatibleLlmProvider · connection test mapping", () => {
  it("returns connected on HTTP 200", async () => {
    const { fetch } = mockFetchFromHandler(() => successCompletion("pong"));
    const llm = createOpenAiCompatibleLlmProvider({
      apiKey: "sk-live",
      fetch,
    });
    await expect(llm.testConnection()).resolves.toEqual({ status: "connected" });
  });

  it("maps HTTP 401 to error, never connected", async () => {
    const { fetch } = mockFetchFromHandler(() => ({
      ok: false,
      status: 401,
      text: "invalid key",
    }));
    const llm = createOpenAiCompatibleLlmProvider({
      apiKey: "sk-bad",
      fetch,
    });
    const result = await llm.testConnection();
    expect(result.status).not.toBe("connected");
    expect(result).toMatchObject({
      status: "error",
      errorCode: "UNAUTHORIZED",
    });
  });

  it("maps HTTP 429 to degraded, never connected", async () => {
    const { fetch } = mockFetchFromHandler(() => ({
      ok: false,
      status: 429,
      text: "rate limited",
    }));
    const llm = createOpenAiCompatibleLlmProvider({
      apiKey: "sk-live",
      fetch,
    });
    const result = await llm.testConnection();
    expect(result.status).not.toBe("connected");
    expect(result).toMatchObject({
      status: "degraded",
      errorCode: "RATE_LIMITED",
    });
  });

  it("maps HTTP 500 to degraded, never connected", async () => {
    const { fetch } = mockFetchFromHandler(() => ({
      ok: false,
      status: 503,
      text: "upstream unavailable",
    }));
    const llm = createOpenAiCompatibleLlmProvider({
      apiKey: "sk-live",
      fetch,
    });
    const result = await llm.testConnection();
    expect(result.status).not.toBe("connected");
    expect(result).toMatchObject({
      status: "degraded",
      errorCode: "SERVER_ERROR",
    });
  });

  it("maps network failures to error, never connected", async () => {
    const llm = createOpenAiCompatibleLlmProvider({
      apiKey: "sk-live",
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
    });
    const result = await llm.testConnection();
    expect(result.status).not.toBe("connected");
    expect(result).toMatchObject({
      status: "error",
      errorCode: "NETWORK_ERROR",
    });
  });

  it("maps missing api key to error, never connected", async () => {
    const llm = createOpenAiCompatibleLlmProvider({
      apiKey: "   ",
      fetch: async () => ({
        ok: true,
        status: 200,
        text: async () => "",
        json: async () => ({}),
      }),
    });
    const result = await llm.testConnection();
    expect(result).toMatchObject({
      status: "error",
      errorCode: "MISSING_API_KEY",
    });
  });
});

describe("OpenAiCompatibleLlmProvider · method error mapping", () => {
  it("summarize surfaces HTTP 401 as thrown provider error", async () => {
    const { fetch } = mockFetchFromHandler(() => ({
      ok: false,
      status: 401,
      text: "invalid key",
    }));
    const llm = createOpenAiCompatibleLlmProvider({
      apiKey: "sk-bad",
      fetch,
    });
    await expect(llm.summarize("Hello")).rejects.toMatchObject({
      name: "LlmProviderError",
      code: "UNAUTHORIZED",
      httpStatus: 401,
    });
  });
});
