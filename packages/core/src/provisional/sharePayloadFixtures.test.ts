/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import {
  getSharePayloadFixture,
  listSharePayloadFixtureIds,
  M4_SHARE_PAYLOAD_FIXTURES,
} from "./sharePayloadFixtures.js";
import { validateSharePayload } from "./sharePayload.js";

describe("sharePayloadFixtures manifest", () => {
  it("lists all fixture ids from docs/evals/m4-share-payload-fixtures.json", () => {
    const ids = listSharePayloadFixtureIds();
    expect(ids).toEqual([
      "share-android-url-ok",
      "share-ios-text-ok",
      "share-ios-image-ocr-fail",
      "share-http-denied",
      "share-secret-field-denied",
      "share-malformed-denied",
      "share-voice-disabled",
    ]);
    expect(M4_SHARE_PAYLOAD_FIXTURES.length).toBe(7);
  });

  it("resolves fixture by id", () => {
    const fixture = getSharePayloadFixture("share-android-url-ok");
    expect(fixture?.platform).toBe("android");
    expect(fixture?.expectIntake).toBe("provisional_link");
  });

  it("validation fixtures match validateSharePayload expectations", () => {
    for (const fixture of M4_SHARE_PAYLOAD_FIXTURES) {
      if (fixture.id === "share-voice-disabled" || fixture.input === undefined) {
        continue;
      }
      const result = validateSharePayload(fixture.input);
      if (fixture.expectValidation === "ok") {
        expect(result.ok, fixture.id).toBe(true);
      } else if (typeof fixture.expectValidation === "string") {
        expect(result.ok, fixture.id).toBe(false);
        if (!result.ok) {
          expect(result.code, fixture.id).toBe(fixture.expectValidation);
        }
      }
    }
  });
});
