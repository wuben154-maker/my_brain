import { describe, expect, it } from "vitest";

import {
  isWhitelistedDiagnosticEvent,
  scanExportPayloadForViolations,
  type DiagnosticEvent,
} from "@my-brain/core";

/** M6 telemetry/analytics field whitelist — Sentry/PostHog optional; default off. */
const TELEMETRY_ALLOWED_EVENT_FIELDS = new Set([
  "intent",
  "outcome",
  "reasonCode",
  "userMode",
  "schemaVersion",
  "appVersion",
  "buildNumber",
  "platform",
  "route",
  "screen",
]);

const TELEMETRY_FORBIDDEN_PAYLOAD_SNIPPETS = [
  '"intro"',
  '"title"',
  '"body"',
  '"transcript"',
  '"articleText"',
  '"profileProse"',
  '"correctionNote"',
  '"api_key"',
  '"rawAudio"',
];

describe("telemetry whitelist", () => {
  it("allows only M6 telemetry-safe diagnostic fields", () => {
    const event: DiagnosticEvent = {
      intent: "ingest_confirm",
      outcome: "ok",
      reasonCode: "IngestProposalError",
      userMode: "learner",
      route: "living-brain-home",
      appVersion: "0.1.0",
      platform: "ios",
    };
    expect(isWhitelistedDiagnosticEvent(event as unknown as Record<string, unknown>)).toBe(
      true,
    );
    for (const key of Object.keys(event)) {
      expect(TELEMETRY_ALLOWED_EVENT_FIELDS.has(key)).toBe(true);
    }
  });

  it("rejects analytics payloads with knowledge or profile prose", () => {
    for (const snippet of TELEMETRY_FORBIDDEN_PAYLOAD_SNIPPETS) {
      const payload = `{"events":[{${snippet}:"敏感正文"}]}`;
      expect(scanExportPayloadForViolations(payload).length).toBeGreaterThan(0);
    }
  });

  it("does not require Sentry or PostHog configuration", () => {
    expect(process.env.SENTRY_DSN ?? "").toBe("");
    expect(process.env.POSTHOG_API_KEY ?? "").toBe("");
  });
});
