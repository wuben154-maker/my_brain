/**
 * Gate verifier expects `packages/core/provisional/ingestGate.test.ts`.
 * Full ingest gate coverage lives in `packages/core/src/provisional/ingestGate.test.ts`.
 */
import { describe, expect, it } from "vitest";

import { captureShareLink } from "../src/provisional/ingestGate.js";
import {
  assertRemoteIngestGatePartition,
  isConfirmedIngestNode,
  partitionRemoteGraphNodes,
} from "../src/sync/ingestGate.js";
import { SyncIngestGateViolation } from "../src/sync/errors.js";

describe("provisional ingestGate (gate path)", () => {
  it("provisional and sync ingest gate modules are reachable", () => {
    expect(typeof captureShareLink).toBe("function");
    expect(
      isConfirmedIngestNode({
        id: "n",
        concept: "c",
        intro: "i",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-06-01T00:00:00.000Z",
        confirmedAt: "2026-06-01T00:01:00.000Z",
        ingestSource: "user_confirmed_ingest",
      }),
    ).toBe(true);
  });

  it("sync ingest gate rejects partial metadata with SyncIngestGateViolation", () => {
    const partition = partitionRemoteGraphNodes([
      {
        id: "partial",
        concept: "c",
        intro: "i",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-06-01T00:00:00.000Z",
        confirmedAt: "2026-06-01T00:01:00.000Z",
      },
    ]);
    expect(() => assertRemoteIngestGatePartition(partition)).toThrow(SyncIngestGateViolation);
  });
});
