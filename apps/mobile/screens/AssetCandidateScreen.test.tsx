/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";

vi.mock("react-native", () => {
  const RN = (tag: string) =>
    function MockComponent({
      children,
      testID,
      onPress,
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
    }) {
      return React.createElement(
        onPress ? "button" : tag,
        { "data-testid": testID, onClick: onPress },
        children,
      );
    };
  return {
    View: RN("div"),
    Text: RN("span"),
    Pressable: RN("button"),
    ScrollView: RN("div"),
    StyleSheet: { create: (s: object) => s, absoluteFillObject: {} },
  };
});

import {
  createEphemeralConversation,
  createProvisionalCandidate,
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
} from "@my-brain/core";

import { AssetCandidateScreen } from "./AssetCandidateScreen";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";

describe("AssetCandidateScreen — CK-16 candidate vs permanent", () => {
  beforeEach(() => {
    const candidate = createProvisionalCandidate({
      sourceType: "project",
      summary: "陪伴型知识 OS",
    });
    useMobileAppStore.setState({
      phase: "adaptive_live",
      coldStartComplete: true,
      assetCandidateTargetId: candidate.id,
      graph: new InMemoryGraphRepository(),
      history: new InMemoryHistoryRepository(),
      conversation: {
        phase: "idle",
        turns: [],
        activeSignalId: null,
        activeProvisionalId: null,
      },
    });
    useProvisionalStore.setState({
      candidates: [candidate],
      lastExplanation: null,
      lastSsrfHint: null,
    });
  });

  afterEach(() => cleanup());

  it("shows cognitive asset type label and candidate-not-permanent guard", () => {
    const candidateId = useMobileAppStore.getState().assetCandidateTargetId!;
    render(<AssetCandidateScreen candidateId={candidateId} />);
    expect(screen.getByTestId("asset-candidate-type-label").textContent).toContain(
      "候选类型 · Project",
    );
    expect(screen.getByTestId("asset-candidate-permanent-guard").textContent).toContain(
      "不是永久资产",
    );
  });

  it("confirm ingest increases graph nodes only after user presses 入库", () => {
    const candidateId = useMobileAppStore.getState().assetCandidateTargetId!;
    render(<AssetCandidateScreen candidateId={candidateId} />);
    const before = useMobileAppStore.getState().graph.countVisibleNodes();
    fireEvent.click(screen.getByTestId("asset-candidate-confirm"));
    const after = useMobileAppStore.getState().graph.countVisibleNodes();
    expect(after).toBe(before + 1);
  });

  it("reject keeps graph unchanged", () => {
    const candidateId = useMobileAppStore.getState().assetCandidateTargetId!;
    render(<AssetCandidateScreen candidateId={candidateId} />);
    const before = useMobileAppStore.getState().graph.countVisibleNodes();
    fireEvent.click(screen.getByTestId("asset-candidate-reject"));
    expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(before);
    expect(useProvisionalStore.getState().candidates[0]?.status).toBe("rejected");
  });
});
