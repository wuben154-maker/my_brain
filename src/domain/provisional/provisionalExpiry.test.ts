import { describe, expect, it } from "vitest";
import { createProvisionalNode, isProvisionalExpired } from "@/domain/provisional/provisionalNode";
import { ProvisionalRepository } from "@/storage/provisionalRepository";
import { generateProvisionalCandidates } from "@/agent/provisionalCandidateGenerator";

describe("provisionalExpiry", () => {
  it("removes expired candidates from repository", () => {
    const repo = new ProvisionalRepository();
    generateProvisionalCandidates(
      [
        {
          id: "prov-expired",
          title: "过期",
          intro: "",
          reason: "test",
          confidence: 0.3,
          expiresAt: "2020-01-01T00:00:00.000Z",
        },
        {
          id: "prov-fresh",
          title: "有效",
          intro: "",
          reason: "test",
          confidence: 0.3,
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      ],
      { repository: repo },
    );

    const nowIso = "2025-06-01T00:00:00.000Z";
    const survivors = repo.list().filter((node) => !isProvisionalExpired(node, nowIso));
    expect(survivors.map((node) => node.id)).toEqual(["prov-fresh"]);

    for (const node of repo.list()) {
      if (isProvisionalExpired(node, nowIso)) {
        repo.delete(node.id);
      }
    }
    expect(repo.list().map((node) => node.id)).toEqual(["prov-fresh"]);
  });

  it("isProvisionalExpired treats past expiresAt as expired", () => {
    const node = createProvisionalNode({
      id: "x",
      title: "t",
      intro: "",
      sourceRefs: [],
      reason: "",
      confidence: 0.1,
      expiresAt: "2020-01-01T00:00:00.000Z",
      createdAt: "2020-01-01T00:00:00.000Z",
    });
    expect(isProvisionalExpired(node, "2025-01-01T00:00:00.000Z")).toBe(true);
  });
});
