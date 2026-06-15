/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from "vitest";

import {
  applyUserIntent,
  createInitialConversationState,
  enterProvisionalPending,
} from "@my-brain/core";
import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
} from "@my-brain/core";

import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";

describe("provisionalQueueFsm mobile — Conductor delegation", () => {
  beforeEach(() => {
    useMobileAppStore.setState({
      graph: new InMemoryGraphRepository(),
      history: new InMemoryHistoryRepository(),
      conversation: createInitialConversationState(),
    });
    useProvisionalStore.setState({ candidates: [], lastExplanation: null, lastSsrfHint: null });
  });

  it("ingest via Conductor + confirm creates permanent node", () => {
    const c = useProvisionalStore.getState().addTextCapture("入库项");
    let conv = enterProvisionalPending(createInitialConversationState(), c.id);
    const { state: next } = applyUserIntent(conv, "ingest");
    useMobileAppStore.getState().setConversation(next);

    const result = useProvisionalStore.getState().confirm(c.id);
    expect(result).not.toBeNull();
    expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(1);
  });

  it("skip via Conductor does not create permanent node", () => {
    const c = useProvisionalStore.getState().addTextCapture("跳过项");
    let conv = enterProvisionalPending(createInitialConversationState(), c.id);
    const { state: next } = applyUserIntent(conv, "skip");
    useMobileAppStore.getState().setConversation(next);
    useProvisionalStore.getState().reject(c.id);
    expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(0);
  });

  it("SSRF-denied link capture does not auto-create permanent node", async () => {
    const c = await useProvisionalStore.getState().addLinkCapture("坏链", "https://203.0.113.1/x");
    expect(c.ssrfRejectCode).toBe("SSRF_HOST_DENIED");
    expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(0);
    let conv = enterProvisionalPending(createInitialConversationState(), c.id);
    const { state: next } = applyUserIntent(conv, "ingest");
    useMobileAppStore.getState().setConversation(next);
    expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(0);
  });
});
