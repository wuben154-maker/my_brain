import { useEffect } from "react";
import { readVisualSnapshotId } from "@/lib/visualSnapshotMode";
import { useAppStore } from "@/stores/appStore";
import { useProposalStore } from "@/stores/proposalStore";

/** Load pending proposals once storage is ready (A4). */
export function useProposalInboxInit(): void {
  const phase = useAppStore((state) => state.phase);
  const storage = useAppStore((state) => state.storage);

  useEffect(() => {
    const visualId = readVisualSnapshotId();
    if (visualId === "inbox" || visualId === "insight") {
      return;
    }
    if (phase !== "ready" && phase !== "onboarding") {
      return;
    }
    if (!storage) {
      return;
    }
    void useProposalStore.getState().load(storage);
  }, [phase, storage]);
}
