import { describe, expect, it } from "vitest";
import {
  detailForDuplicateMerge,
  detailForEdgeMigrate,
  detailForIngestLink,
  detailForStaleArchive,
  metaForDuplicateMerge,
  metaForIngestLink,
  metaForStaleArchive,
} from "@/agent/curation/curationReason";

describe("curationReason", () => {
  it("renders ingest_link detail template", () => {
    expect(detailForIngestLink("Graphiti", "AI Agent")).toBe(
      "新概念 Graphiti 与已有 AI Agent 编排能力相关，自动连边。",
    );
  });

  it("renders duplicate_merge detail template", () => {
    expect(detailForDuplicateMerge("RAG")).toBe(
      "与 RAG 含义重复，已合并并迁移关联边。",
    );
  });

  it("renders stale_archive detail template", () => {
    expect(detailForStaleArchive("旧版向量检索")).toBe(
      "旧版向量检索 已被新概念替代，已归档隐藏。",
    );
  });

  it("renders edge_migrate detail template", () => {
    expect(detailForEdgeMigrate(3, "RAG")).toBe(
      "合并后 3 条关系已迁移到 RAG。",
    );
  });

  it("builds meta with reason codes and affected nodes", () => {
    expect(metaForIngestLink("a", "b", "A", "B")).toMatchObject({
      reasonCode: "ingest_link",
      affectedNodeIds: ["a", "b"],
    });
    expect(metaForDuplicateMerge("dup", "rag", "RAG")).toMatchObject({
      reasonCode: "duplicate_merge",
      affectedNodeIds: ["dup", "rag"],
    });
    expect(metaForStaleArchive("stale", "旧概念")).toMatchObject({
      reasonCode: "stale_archive",
      affectedNodeIds: ["stale"],
    });
  });
});
