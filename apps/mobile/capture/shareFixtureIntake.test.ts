/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { InMemoryGraphRepository } from "@my-brain/core";
import * as ingestModule from "@my-brain/core";
import { M4_SHARE_PAYLOAD_FIXTURES } from "@my-brain/core";

import { setMobileUrlGuardForTests } from "./guardedCapture";
import { intakeSharePayloadFixture } from "./shareFixtureIntake";

describe("shareFixtureIntake — manifest fixtures → provisional", () => {
  afterEach(() => {
    setMobileUrlGuardForTests(null);
  });

  it("runs all manifest fixtures without creating permanent nodes", async () => {
    setMobileUrlGuardForTests({
      resolveDns: async () => ["93.184.216.34"],
      fetch: async () => ({ status: 200, body: new TextEncoder().encode("ok") }),
    });

    const spy = vi.spyOn(ingestModule, "applyIngestCreate");

    for (const fixture of M4_SHARE_PAYLOAD_FIXTURES) {
      const graph = new InMemoryGraphRepository();
      const diagnostic = await intakeSharePayloadFixture(fixture.id, { graph });

      expect(graph.countVisibleNodes(), fixture.id).toBe(0);

      if (fixture.expectIntake === "safe_error_no_permanent") {
        expect(diagnostic.ok, fixture.id).toBe(false);
      } else if (fixture.expectIntake === "SHARE_INTAKE_VOICE_DISABLED") {
        expect(diagnostic.ok, fixture.id).toBe(false);
        expect(diagnostic.code, fixture.id).toBe("SHARE_INTAKE_VOICE_DISABLED");
      } else {
        expect(diagnostic.ok, fixture.id).toBe(true);
        if (fixture.expectIntake === "provisional_link") {
          expect(diagnostic.sourceType, fixture.id).toBe("link");
        }
        if (fixture.expectIntake === "provisional_text") {
          expect(diagnostic.sourceType, fixture.id).toBe("text");
        }
        if (fixture.expectIntake === "provisional_image_editable_placeholder") {
          expect(diagnostic.sourceType, fixture.id).toBe("image_mock");
        }
      }
    }

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("returns unknown fixture diagnostic", async () => {
    const graph = new InMemoryGraphRepository();
    const result = await intakeSharePayloadFixture("not-a-fixture", { graph });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("SHARE_FIXTURE_UNKNOWN");
  });
});
