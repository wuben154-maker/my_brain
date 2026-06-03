import { describe, expect, it, vi } from "vitest";
import { EverMemOsProvider } from "./everMemOsProvider";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("EverMemOsProvider", () => {
  it("stores distilled text and searches with hybrid retrieve_method via GET", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const href = String(input);
      calls.push({ url: href, init });

      if (href.endsWith("/health")) {
        return jsonResponse({ status: "healthy" });
      }
      if (href.includes("/memories/search")) {
        const url = new URL(href);
        expect(url.searchParams.get("retrieve_method")).toBe("hybrid");
        expect(url.searchParams.get("user_id")).toBe("user_test");
        expect(url.searchParams.getAll("memory_types")).toEqual([
          "episodic_memory",
          "event_log",
        ]);
        return jsonResponse({
          result: {
            memories: [{ content: "用户喜欢 RAG", score: 0.91 }],
          },
        });
      }
      if (href.endsWith("/memories")) {
        return jsonResponse({ ok: true });
      }
      return jsonResponse({}, 404);
    });

    const provider = new EverMemOsProvider({
      baseUrl: "http://localhost:1995",
      userId: "user_test",
      fetchImpl: fetchMock,
    });

    await provider.remember([
      {
        kind: "episode",
        text: "用户讨论了 RAG 原理",
        timestamp: 1_700_000_000_000,
      },
    ]);

    const recalled = await provider.recall({ query: "RAG", topK: 3 });
    expect(recalled[0]?.item.text).toContain("RAG");
    expect(recalled[0]?.score).toBeGreaterThan(0);

    const searchCall = calls.find((call) => call.url.includes("/memories/search"));
    expect(searchCall).toBeDefined();
    expect(searchCall?.init?.method).toBe("GET");
    expect(searchCall?.init?.body).toBeUndefined();
    const storeCall = calls.find(
      (call) => call.url.endsWith("/memories") && call.init?.method === "POST",
    );
    expect(storeCall).toBeDefined();
  });

  it("degrades recall to empty array when health fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/health")) {
        throw new Error("ECONNREFUSED");
      }
      return jsonResponse({});
    });

    const provider = new EverMemOsProvider({
      baseUrl: "http://localhost:1995",
      userId: "user_test",
      fetchImpl: fetchMock,
    });

    const recalled = await provider.recall({ query: "anything" });
    expect(recalled).toEqual([]);
  });

  it("queues remember items when sidecar is down", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/health")) {
        return jsonResponse({ status: "unhealthy" }, 503);
      }
      return jsonResponse({});
    });

    const provider = new EverMemOsProvider({
      baseUrl: "http://localhost:1995",
      userId: "user_test",
      fetchImpl: fetchMock,
    });

    await provider.remember([
      { kind: "fact", text: "用户偏好简洁讲解", timestamp: Date.now() },
    ]);
    expect(provider.pendingCount()).toBe(1);
  });

  it("recall uses GET with query params and no request body", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const href = String(input);
      if (href.endsWith("/health")) {
        return jsonResponse({ status: "healthy" });
      }
      if (href.includes("/memories/search")) {
        expect(init?.method).toBe("GET");
        expect(init?.body).toBeUndefined();
        const url = new URL(href);
        expect(url.searchParams.get("query")).toBe("no-get-body");
        return jsonResponse({ result: { memories: [] } });
      }
      return jsonResponse({}, 404);
    });

    const provider = new EverMemOsProvider({
      baseUrl: "http://localhost:1995",
      userId: "user_test",
      fetchImpl: fetchMock,
    });

    await provider.recall({ query: "no-get-body" });
    const searchCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/memories/search"),
    );
    expect(searchCall?.[1]?.method).toBe("GET");
    expect(searchCall?.[1]?.body).toBeUndefined();
  });

  it("tolerates truncated or invalid search JSON", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const href = String(input);
      if (href.endsWith("/health")) {
        return jsonResponse({ status: "healthy" });
      }
      if (href.includes("/memories/search")) {
        return new Response("{not-json", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return jsonResponse({});
    });

    const provider = new EverMemOsProvider({
      baseUrl: "http://localhost:1995",
      userId: "user_test",
      fetchImpl: fetchMock,
    });

    await expect(provider.recall({ query: "test" })).resolves.toEqual([]);
  });
});
