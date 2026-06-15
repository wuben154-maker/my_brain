import { beforeEach, describe, expect, it } from "vitest";

import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
} from "@my-brain/core";

import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";

describe("provisionalStore", () => {
  beforeEach(() => {
    useMobileAppStore.setState({
      graph: new InMemoryGraphRepository(),
      history: new InMemoryHistoryRepository(),
      visibleNodes: [],
    });
    useProvisionalStore.setState({ candidates: [], lastExplanation: null, lastSsrfHint: null });
  });

  it("capture adds candidate without permanent node", () => {
    const graph = useMobileAppStore.getState().graph;
    useProvisionalStore.getState().addTextCapture("记下创业想法：语音笔记 App");
    expect(graph.countVisibleNodes()).toBe(0);
    expect(useProvisionalStore.getState().listPending().length).toBe(1);
  });

  it("confirm lights graph via core queue", () => {
    const graph = useMobileAppStore.getState().graph;
    const candidate = useProvisionalStore.getState().addTextCapture("创业想法");
    const result = useProvisionalStore.getState().confirm(candidate.id);
    expect(result?.nodeId).toMatch(/^node-/);
    expect(graph.countVisibleNodes()).toBe(1);
  });
});

describe("mobileAppStore corrections", () => {
  beforeEach(() => {
    useMobileAppStore.setState({
      graph: new InMemoryGraphRepository(),
      history: new InMemoryHistoryRepository(),
      userProfile: null,
      correctionState: { traits: [], corrections: [], suppressionList: [] },
    });
  });

  it("suppress reroutes adaptive radar", () => {
    useMobileAppStore.getState().completeColdStart({
      primaryMode: "learner",
      secondaryModes: [],
      confidence: 0.8,
    });
    const before = useMobileAppStore.getState().signals.length;
    useMobileAppStore.getState().applyCorrection("mode-learner", "suppress");
    const after = useMobileAppStore.getState().signals;
    expect(after.length).toBeLessThanOrEqual(before);
  });
});
