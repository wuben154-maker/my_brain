import { describe, expect, it } from "vitest";
import type { BriefingFeedback } from "@/domain/radar/briefingItem";
import {
  createTempStorage,
  reopenStorage,
  STORAGE_BACKEND_KINDS,
  type StorageBackendKind,
} from "@/invariants/testStorage";
import {
  createBriefingFeedbackId,
  groupBriefingFeedbackByItemId,
  InvalidBriefingFeedbackError,
  validateBriefingFeedback,
} from "@/storage/briefingFeedbackRepo";
import { RADAR_SHOWCASE_NOW } from "@/radar/worldSources/fixtureWorldSource";

const sampleFeedback: BriefingFeedback = {
  kind: "not_interested",
  worldItemId: "radar-wi-rel-1",
  at: RADAR_SHOWCASE_NOW,
};

describe("briefingFeedbackRepo", () => {
  it("validates feedback kinds and ISO timestamps", () => {
    expect(validateBriefingFeedback(sampleFeedback)).toEqual(sampleFeedback);
    expect(() =>
      validateBriefingFeedback({
        ...sampleFeedback,
        kind: "invalid" as BriefingFeedback["kind"],
      }),
    ).toThrow(InvalidBriefingFeedbackError);
  });

  it("groups feedback rows by world item id", () => {
    const grouped = groupBriefingFeedbackByItemId([
      sampleFeedback,
      {
        kind: "too_shallow",
        worldItemId: "radar-wi-rel-1",
        at: "2026-06-01T13:00:00.000Z",
      },
      {
        kind: "already_know",
        worldItemId: "radar-wi-rel-2",
        at: RADAR_SHOWCASE_NOW,
      },
    ]);
    expect(grouped["radar-wi-rel-1"]).toHaveLength(2);
    expect(grouped["radar-wi-rel-2"]).toHaveLength(1);
  });

  it.each(STORAGE_BACKEND_KINDS)(
    "persists briefing feedback across reload (%s)",
    async (kind: StorageBackendKind) => {
      const fixture = createTempStorage(kind);
      try {
        await fixture.storage.init();
        await fixture.storage.saveBriefingFeedback(sampleFeedback);
        await fixture.storage.close();

        const reopened = reopenStorage(fixture.dbPath, kind);
        await reopened.init();
        const rows = await reopened.listBriefingFeedback();
        await reopened.close();

        expect(rows).toHaveLength(1);
        expect(rows[0]).toEqual(sampleFeedback);
        expect(createBriefingFeedbackId(rows[0]!)).toBe(
          createBriefingFeedbackId(sampleFeedback),
        );
      } finally {
        fixture.cleanup();
      }
    },
  );
});
