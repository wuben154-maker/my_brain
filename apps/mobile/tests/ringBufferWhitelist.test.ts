import { describe, expect, it } from "vitest";

import {
  isWhitelistedDiagnosticEvent,
  sanitizeDiagnosticExport,
  scanExportPayloadForViolations,
} from "@my-brain/core";

describe("ringBufferWhitelist", () => {
  it("accepts whitelisted diagnostic fields only", () => {
    expect(
      isWhitelistedDiagnosticEvent({
        intent: "ingest_confirm",
        outcome: "ok",
        reasonCode: "IngestProposalError",
        userMode: "learner",
      }),
    ).toBe(true);
  });

  it("rejects node intro and transcript-like payloads", () => {
    expect(
      isWhitelistedDiagnosticEvent({
        intent: "export",
        outcome: "fail",
        reasonCode: "x",
        intro: "节点正文不应出现",
      }),
    ).toBe(false);
    expect(
      isWhitelistedDiagnosticEvent({
        intent: "voice",
        outcome: "fail",
        reasonCode: "x",
        transcript: "用户说了什么",
      }),
    ).toBe(false);
  });

  it("export scan fails when forbidden keys present", () => {
    const payload = JSON.stringify({
      events: [{ intent: "x", outcome: "ok", reasonCode: "y", title: "secret node" }],
    });
    const violations = scanExportPayloadForViolations(payload);
    expect(violations.length).toBeGreaterThan(0);
    const safe = sanitizeDiagnosticExport([
      { intent: "migration_retry", outcome: "ok", reasonCode: "SchemaMigrationError" },
    ]);
    expect(scanExportPayloadForViolations(JSON.stringify(safe))).toHaveLength(0);
  });
});
