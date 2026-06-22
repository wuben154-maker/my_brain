import { describe, expect, it, vi } from "vitest";

import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
} from "../graph/memoryRepository.js";
import * as cognitiveAssetModule from "./cognitiveAsset.js";
import { createProvisionalCandidate } from "../provisional/queue.js";
import {
  assertConfirmedIngestOnly,
  assetTypeFromProvisionalSource,
  asCognitiveAssetCandidate,
  CognitiveAssetType,
  COGNITIVE_ASSET_TYPE_LABELS,
  cognitiveAssetTypeLabel,
  confirmUserIngest,
  formatCandidateTypeLabel,
  isCognitiveAssetCandidate,
  isCognitiveAssetPermanent,
  toPermanentCognitiveAsset,
} from "./cognitiveAsset.js";
import { confirmCandidate } from "../provisional/queue.js";

describe("cognitive asset model — CK-16", () => {
  it("models all cognitive asset types", () => {
    expect(Object.keys(CognitiveAssetType)).toHaveLength(4);
    expect(COGNITIVE_ASSET_TYPE_LABELS[CognitiveAssetType.Concept]).toBe("Concept");
    expect(cognitiveAssetTypeLabel(CognitiveAssetType.Project)).toBe("Project");
  });

  it("maps provisional sources to cognitive asset types", () => {
    expect(assetTypeFromProvisionalSource("learning")).toBe(CognitiveAssetType.Learning);
    expect(assetTypeFromProvisionalSource("project")).toBe(CognitiveAssetType.Project);
    expect(assetTypeFromProvisionalSource("life")).toBe(CognitiveAssetType.Life);
    expect(assetTypeFromProvisionalSource("text")).toBe(CognitiveAssetType.Concept);
    expect(assetTypeFromProvisionalSource("link")).toBe(CognitiveAssetType.Concept);
    expect(assetTypeFromProvisionalSource("image_mock")).toBe(CognitiveAssetType.Concept);
    expect(assetTypeFromProvisionalSource("voice_note_mock")).toBe(CognitiveAssetType.Life);
  });

  it("formats candidate type labels for UI distinction", () => {
    const candidate = createProvisionalCandidate({
      sourceType: "project",
      summary: "陪伴型知识 OS",
    });
    expect(formatCandidateTypeLabel(candidate)).toBe("候选类型 · Project");
  });

  it("distinguishes candidate vs permanent records", () => {
    const candidate = asCognitiveAssetCandidate(
      createProvisionalCandidate({ sourceType: "project", summary: "MVP 里程碑" }),
    );
    expect(isCognitiveAssetCandidate(candidate)).toBe(true);
    expect(isCognitiveAssetPermanent(candidate)).toBe(false);
    expect(candidate.kind).toBe("candidate");

    const permanent = toPermanentCognitiveAsset(
      CognitiveAssetType.Project,
      { nodeId: "node-1", autoCurateSummary: "ok", changeId: "chg-1" },
      "MVP 里程碑",
    );
    expect(isCognitiveAssetPermanent(permanent)).toBe(true);
    expect(isCognitiveAssetCandidate(permanent)).toBe(false);
    expect(permanent.kind).toBe("permanent");
  });

  it("assertConfirmedIngestOnly blocks unconfirmed permanent ingest", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();

    expect(() =>
      assertConfirmedIngestOnly(
        { concept: "Rust", intro: "x", sourceLinks: [] },
        { graph, history },
        { userConfirmed: false },
      ),
    ).toThrow(/user confirmation/);
    expect(graph.countVisibleNodes()).toBe(0);
  });

  it("assertConfirmedIngestOnly delegates to applyIngestCreate when confirmed", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();

    const result = assertConfirmedIngestOnly(
      { concept: "Rust 所有权", intro: "短介绍", sourceLinks: [] },
      { graph, history },
      { userConfirmed: true },
    );

    expect(graph.countVisibleNodes()).toBe(1);
    expect(result.nodeId).toMatch(/^node-/);
  });

  it("confirmUserIngest is the confirmed permanent entry helper", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();

    const result = confirmUserIngest(
      { concept: "Voice OS", intro: "语音伴侣主线", sourceLinks: [] },
      { graph, history },
    );

    expect(graph.countVisibleNodes()).toBe(1);
    expect(result.nodeId).toMatch(/^node-/);
  });

  it("confirmCandidate routes through confirmUserIngest gate", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    const spy = vi.spyOn(cognitiveAssetModule, "confirmUserIngest");
    const candidate = createProvisionalCandidate({
      sourceType: "learning",
      summary: "Rust 所有权",
    });

    confirmCandidate([candidate], candidate.id, { graph, history });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ concept: "Rust 所有权", intro: "Rust 所有权" }),
      { graph, history },
    );
    spy.mockRestore();
  });
});
