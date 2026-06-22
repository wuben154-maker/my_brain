/**
 * M4 share payload fixture manifest — mirrors docs/evals/m4-share-payload-fixtures.json.
 * Mock/prep only: simulates App Group / Android intent JSON without native integration.
 */

import type { SharePayloadRejectCode } from "./sharePayload.js";

export type ShareFixtureExpectIntake =
  | "provisional_link"
  | "provisional_text"
  | "provisional_image_editable_placeholder"
  | "safe_error_no_permanent"
  | "SHARE_INTAKE_VOICE_DISABLED";

export interface SharePayloadFixture {
  id: string;
  platform?: "android" | "ios";
  payloadKind?: "url" | "text" | "image";
  /** Raw App Group / intent JSON (or malformed scalar for deny fixtures). */
  input?: unknown;
  expectValidation?: "ok" | SharePayloadRejectCode | string;
  expectIntake?: ShareFixtureExpectIntake;
  note?: string;
  ocrNote?: string;
}

/** Canonical fixture list for mock intake diagnostics and tests. */
export const M4_SHARE_PAYLOAD_FIXTURES: readonly SharePayloadFixture[] = [
  {
    id: "share-android-url-ok",
    platform: "android",
    payloadKind: "url",
    input: {
      platform: "android",
      payloadKind: "url",
      url: "https://example.com/article",
      title: "Chrome 分享",
      sourceApp: "com.android.chrome",
      capturedAt: "2026-06-15T10:00:00.000Z",
    },
    expectValidation: "ok",
    expectIntake: "provisional_link",
  },
  {
    id: "share-ios-text-ok",
    platform: "ios",
    payloadKind: "text",
    input: {
      platform: "ios",
      payloadKind: "text",
      title: "备忘录片段",
      sourceApp: "com.apple.mobilenotes",
    },
    expectValidation: "ok",
    expectIntake: "provisional_text",
  },
  {
    id: "share-ios-image-ocr-fail",
    platform: "ios",
    payloadKind: "image",
    input: {
      platform: "ios",
      payloadKind: "image",
      mime: "image/png",
      title: "相册截图",
    },
    expectValidation: "ok",
    expectIntake: "provisional_image_editable_placeholder",
    ocrNote: "on-device OCR mock fails → image ref + editable summary only",
  },
  {
    id: "share-http-denied",
    platform: "android",
    payloadKind: "url",
    input: {
      platform: "android",
      payloadKind: "url",
      url: "http://example.com/insecure",
    },
    expectValidation: "SHARE_PAYLOAD_URL_INVALID",
    expectIntake: "safe_error_no_permanent",
  },
  {
    id: "share-secret-field-denied",
    platform: "ios",
    payloadKind: "text",
    input: {
      platform: "ios",
      payloadKind: "text",
      title: "hi",
      apiKey: "sk-test",
    },
    expectValidation: "SHARE_PAYLOAD_SECRET_FIELD",
    expectIntake: "safe_error_no_permanent",
  },
  {
    id: "share-malformed-denied",
    input: "not-json",
    expectValidation: "SHARE_PAYLOAD_INVALID",
    expectIntake: "safe_error_no_permanent",
  },
  {
    id: "share-voice-disabled",
    note: "voice_note_mock — M3 not PASS",
    expectIntake: "SHARE_INTAKE_VOICE_DISABLED",
  },
] as const;

export function getSharePayloadFixture(id: string): SharePayloadFixture | undefined {
  return M4_SHARE_PAYLOAD_FIXTURES.find((f) => f.id === id);
}

export function listSharePayloadFixtureIds(): string[] {
  return M4_SHARE_PAYLOAD_FIXTURES.map((f) => f.id);
}
