import { describe, expect, it } from "vitest";

import {
  isConfirmedIngestNode,
  partitionRemoteGraphNodes,
  remoteNodesToProvisional,
  assertMergedGraphIngestGate,
  assertRemoteIngestGatePartition,
} from "../src/sync/ingestGate.js";
import { SyncIngestGateViolation } from "../src/sync/errors.js";

describe("sync ingestGate", () => {
  it("treats nodes without user_confirmed_ingest as not confirmed", () => {
    expect(
      isConfirmedIngestNode({
        id: "n1",
        concept: "x",
        intro: "y",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-06-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("accepts confirmed ingest metadata", () => {
    expect(
      isConfirmedIngestNode({
        id: "n2",
        concept: "x",
        intro: "y",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-06-01T00:00:00.000Z",
        confirmedAt: "2026-06-01T00:01:00.000Z",
        ingestSource: "user_confirmed_ingest",
      }),
    ).toBe(true);
  });

  it("partitions remote nodes into confirmed vs provisional", () => {
    const result = partitionRemoteGraphNodes([
      {
        id: "confirmed",
        concept: "ok",
        intro: "ok",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-06-01T00:00:00.000Z",
        confirmedAt: "2026-06-01T00:01:00.000Z",
        ingestSource: "user_confirmed_ingest",
      },
      {
        id: "pending",
        concept: "wait",
        intro: "wait",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-06-02T00:00:00.000Z",
      },
    ]);
    expect(result.confirmed).toHaveLength(1);
    expect(result.provisional).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
  });

  it("routes unconfirmed remote nodes to provisional candidates", () => {
    const provisional = remoteNodesToProvisional(
      [
        {
          id: "remote-new",
          concept: "Silent create",
          intro: "must not be permanent",
          sourceLinks: [],
          archived: false,
          createdAt: "2026-06-03T00:00:00.000Z",
        },
      ],
      "device-b",
    );
    expect(provisional).toHaveLength(1);
    expect(provisional[0]?.status).toBe("pending");
    expect(provisional[0]?.ingestSource).toBe("provisional_pending");
    expect(provisional[0]?.evidenceRefs[0]).toContain("device-b");
  });

  it("throws SyncIngestGateViolation for partial ingest metadata bypass", () => {
    const partition = partitionRemoteGraphNodes([
      {
        id: "bypass",
        concept: "bad",
        intro: "partial metadata",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-06-04T00:00:00.000Z",
        ingestSource: "llm_suggested",
      },
    ]);
    expect(() => assertRemoteIngestGatePartition(partition)).toThrow(SyncIngestGateViolation);
  });

  it("assertMergedGraphIngestGate throws SyncIngestGateViolation", () => {
    expect(() =>
      assertMergedGraphIngestGate({
        nodes: [
          {
            id: "leak",
            concept: "x",
            intro: "y",
            sourceLinks: [],
            archived: false,
            createdAt: "2026-06-05T00:00:00.000Z",
          },
        ],
        edges: [],
      }),
    ).toThrow(SyncIngestGateViolation);
  });
});
