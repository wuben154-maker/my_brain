import { describe, expect, it } from "vitest";
import { readRepoSource } from "@/invariants/readRepoSource";

describe("useAgentScheduler (v2)", () => {
  it("does not register A3/C2 proposal jobs", () => {
    const source = readRepoSource("src/hooks/useAgentScheduler.ts");
    expect(source).toContain("v2-no-proposals");
    expect(source).not.toMatch(/morningBriefJob|createMorningBriefJob/);
    expect(source).not.toMatch(/curationScanJob|createCurationScanJob/);
  });
});
