import { describe, expect, it, vi } from "vitest";

import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
} from "../graph/memoryRepository.js";
import * as cognitiveAssetModule from "../asset/cognitiveAsset.js";
import {
  addCandidate,
  confirmCandidate,
  createProvisionalCandidate,
  explainCandidate,
  listPendingCandidates,
  rejectCandidate,
} from "./queue.js";

describe("provisional queue", () => {
  it("no permanent node before confirm", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    const queue = addCandidate(
      [],
      createProvisionalCandidate({
        sourceType: "text",
        summary: "创业想法：语音笔记 App",
      }),
    );

    expect(graph.countVisibleNodes()).toBe(0);
    expect(listPendingCandidates(queue).length).toBe(1);
  });

  it("confirm creates permanent node", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    const queue = addCandidate(
      [],
      createProvisionalCandidate({
        sourceType: "text",
        summary: "创业想法：语音笔记 App",
      }),
    );
    const id = queue[0]!.id;

    const result = confirmCandidate(queue, id, { graph, history });
    expect(graph.countVisibleNodes()).toBe(1);
    expect(result.nodeId).toMatch(/^node-/);
    expect(result.queue.find((c) => c.id === id)?.status).toBe("confirmed");
  });

  it("confirm routes through confirmUserIngest gate", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    const spy = vi.spyOn(cognitiveAssetModule, "confirmUserIngest");
    const queue = addCandidate(
      [],
      createProvisionalCandidate({
        sourceType: "project",
        summary: "陪伴型知识 OS",
      }),
    );

    confirmCandidate(queue, queue[0]!.id, { graph, history });

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("reject clears candidate without graph change", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    const queue = addCandidate(
      [],
      createProvisionalCandidate({ sourceType: "link", summary: "mock link", linkUrl: "https://example.com/a" }),
    );
    const id = queue[0]!.id;
    const rejected = rejectCandidate(queue, id);
    expect(rejected.find((c) => c.id === id)?.status).toBe("rejected");
    expect(graph.countVisibleNodes()).toBe(0);
    expect(listPendingCandidates(rejected).length).toBe(0);
    void history;
  });

  it("explain keeps provisional pending", () => {
    const queue = addCandidate(
      [],
      createProvisionalCandidate({ sourceType: "text", summary: "待解释" }),
    );
    const id = queue[0]!.id;
    const { queue: updated, explanation } = explainCandidate(queue, id);
    expect(explanation).toContain("mock");
    expect(updated.find((c) => c.id === id)?.status).toBe("explaining");
  });
});
