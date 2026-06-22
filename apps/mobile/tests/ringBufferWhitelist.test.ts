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
    expect(
      isWhitelistedDiagnosticEvent({
        intent: "ingest",
        outcome: "fail",
        reasonCode: "x",
        body: "图谱片段正文",
      }),
    ).toBe(false);
    expect(
      isWhitelistedDiagnosticEvent({
        intent: "profile",
        outcome: "fail",
        reasonCode: "x",
        profileProse: "用户画像敏感长文",
      }),
    ).toBe(false);
  });

  it("allows route and version metadata for crash localization", () => {
    expect(
      isWhitelistedDiagnosticEvent({
        intent: "crash",
        outcome: "fail",
        reasonCode: "unhandled_error",
        route: "settings-screen",
        screen: "SettingsScreen",
        appVersion: "0.1.0",
        buildNumber: "42",
        platform: "ios",
      }),
    ).toBe(true);
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
