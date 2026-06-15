import { describe, expect, it, vi } from "vitest";

import { InMemoryGraphRepository } from "../graph/memoryRepository.js";
import * as ingestModule from "../conversation/ingest.js";
import { confirmCandidate, createProvisionalCandidate } from "./queue.js";
import {
  captureOcrFixture,
  captureShareLink,
  captureSyncImportFixture,
} from "./ingestGate.js";

describe("M4 ingest gate — no bypass before user confirm", () => {
  it("captureShareLink does not call applyIngestCreate or create permanent node", async () => {
    const graph = new InMemoryGraphRepository();
    const spy = vi.spyOn(ingestModule, "applyIngestCreate");

    const { candidate, fetchResult } = await captureShareLink(
      { summary: "分享链接", linkUrl: "https://example.com/article" },
      {
        graph,
        urlGuard: {
          resolveDns: async () => ["93.184.216.34"],
          fetch: async () => ({ status: 200, body: new TextEncoder().encode("ok") }),
        },
      },
    );

    expect(fetchResult.ok).toBe(true);
    expect(candidate.status).toBe("pending");
    expect(graph.countVisibleNodes()).toBe(0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("SSRF-denied share still saves provisional candidate without permanent node", async () => {
    const graph = new InMemoryGraphRepository();
    const spy = vi.spyOn(ingestModule, "applyIngestCreate");

    const { candidate, fetchResult } = await captureShareLink(
      { summary: "私网链接", linkUrl: "http://example.com/insecure" },
      { graph },
    );

    expect(fetchResult.ok).toBe(false);
    expect(candidate.ssrfRejectCode).toBe("SSRF_SCHEME_DENIED");
    expect(graph.countVisibleNodes()).toBe(0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("captureOcrFixture does not create permanent node", () => {
    const graph = new InMemoryGraphRepository();
    const spy = vi.spyOn(ingestModule, "applyIngestCreate");

    const candidate = captureOcrFixture(
      { summary: "截图 OCR 摘要", imageRef: "file://mock/screenshot.png" },
      { graph },
    );

    expect(candidate.sourceType).toBe("image_mock");
    expect(graph.countVisibleNodes()).toBe(0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("captureSyncImportFixture does not create permanent node", () => {
    const graph = new InMemoryGraphRepository();
    const spy = vi.spyOn(ingestModule, "applyIngestCreate");

    const candidate = captureSyncImportFixture(
      { summary: "同步导入节点", externalId: "ext-42" },
      { graph },
    );

    expect(candidate.sourceType).toBe("project");
    expect(graph.countVisibleNodes()).toBe(0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("only confirmCandidate + ingest creates permanent node", async () => {
    const graph = new InMemoryGraphRepository();
    const history = (await import("../graph/memoryRepository.js")).InMemoryHistoryRepository;
    const hist = new history();

    const { candidate } = await captureShareLink(
      { summary: "待确认", linkUrl: "https://example.com/x" },
      {
        graph,
        urlGuard: {
          resolveDns: async () => ["93.184.216.34"],
          fetch: async () => ({ status: 200, body: new Uint8Array() }),
        },
      },
    );

    expect(graph.countVisibleNodes()).toBe(0);
    const result = confirmCandidate([candidate], candidate.id, { graph, history: hist });
    expect(graph.countVisibleNodes()).toBe(1);
    expect(result.nodeId).toMatch(/^node-/);
  });
});
