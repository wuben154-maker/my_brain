/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VISUAL_INBOX_ENVELOPE } from "@/lib/visualSnapshotFixtures";
import * as visualSnapshotMode from "@/lib/visualSnapshotMode";
import { useAppStore } from "@/stores/appStore";
import { useProposalStore } from "@/stores/proposalStore";
import type { StorageProvider } from "@/storage/types";
import { useProposalInboxActions } from "./useProposalInboxActions";

describe("useProposalInboxActions (H3 · local-first)", () => {
  beforeEach(() => {
    useAppStore.setState({ storage: null });
    useProposalStore.setState({ pending: [VISUAL_INBOX_ENVELOPE] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useAppStore.setState({ storage: null });
    useProposalStore.getState().reset();
  });

  it("refuses approve without storage even in ?visual=inbox", async () => {
    vi.spyOn(visualSnapshotMode, "readVisualSnapshotId").mockReturnValue("inbox");

    const { result } = renderHook(() => useProposalInboxActions());

    await act(async () => {
      await result.current.approve(VISUAL_INBOX_ENVELOPE.id);
    });

    expect(result.current.errorMessage).toBe("本地存储未就绪");
    expect(useProposalStore.getState().pending).toEqual([VISUAL_INBOX_ENVELOPE]);
  });

  it("approve uses proposalStore when storage is ready", async () => {
    vi.spyOn(visualSnapshotMode, "readVisualSnapshotId").mockReturnValue("inbox");
    const storage = { id: "mock-storage" } as unknown as StorageProvider;
    useAppStore.setState({ storage });

    const approve = vi
      .spyOn(useProposalStore.getState(), "approve")
      .mockResolvedValue(undefined);

    const { result } = renderHook(() => useProposalInboxActions());

    await act(async () => {
      await result.current.approve(VISUAL_INBOX_ENVELOPE.id);
    });

    expect(approve).toHaveBeenCalledWith(
      storage,
      storage,
      VISUAL_INBOX_ENVELOPE.id,
    );
    expect(result.current.errorMessage).toBeNull();
  });
});
