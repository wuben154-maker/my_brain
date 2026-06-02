import { create } from "zustand";
import type { AgentDigest } from "@/agent/types";

interface AgentInboxState {
  /** Session-only morning brief; never persisted as raw articles. */
  digest: AgentDigest | null;
  digestDismissed: boolean;
  inboxOpen: boolean;
  setDigest: (digest: AgentDigest | null) => void;
  dismissDigest: () => void;
  setInboxOpen: (open: boolean) => void;
}

export const useAgentInboxStore = create<AgentInboxState>((set) => ({
  digest: null,
  digestDismissed: false,
  inboxOpen: false,
  setDigest: (digest) => set({ digest, digestDismissed: false }),
  dismissDigest: () => set({ digestDismissed: true }),
  setInboxOpen: (inboxOpen) => set({ inboxOpen }),
}));
