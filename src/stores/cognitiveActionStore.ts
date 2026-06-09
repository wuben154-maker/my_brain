import { create } from "zustand";
import {
  ActionDraftGuardError,
  assertActionDraftOnly,
  assertConfirmableDraft,
  assertUserConfirmedAction,
} from "@/actions/actionDraftGuard";
import {
  createCognitiveAction,
  type CreateCognitiveActionInput,
} from "@/actions/createCognitiveAction";
import type {
  CognitiveAction,
  CognitiveActionUserEvent,
} from "@/domain/actions/cognitiveAction";
import type { StorageProvider } from "@/storage/types";

interface CognitiveActionState {
  actions: CognitiveAction[];
  loaded: boolean;
  persistWarning: boolean;
  load: (storage: StorageProvider) => Promise<void>;
  createAndStore: (
    storage: StorageProvider | null,
    input: CreateCognitiveActionInput,
  ) => Promise<CognitiveAction>;
  listDrafts: () => CognitiveAction[];
  dismissAction: (
    storage: StorageProvider | null,
    id: string,
  ) => Promise<void>;
  confirmAction: (
    storage: StorageProvider | null,
    id: string,
    userEvent: CognitiveActionUserEvent | undefined,
  ) => Promise<CognitiveAction>;
  clear: () => void;
}

async function persistAction(
  storage: StorageProvider | null,
  action: CognitiveAction,
): Promise<boolean> {
  if (!storage) {
    return false;
  }
  try {
    await storage.saveCognitiveAction(action);
    return true;
  } catch {
    return false;
  }
}

export const useCognitiveActionStore = create<CognitiveActionState>((set, get) => ({
  actions: [],
  loaded: false,
  persistWarning: false,
  load: async (storage) => {
    const rows = await storage.listCognitiveActions();
    set({ actions: rows, loaded: true });
  },
  createAndStore: async (storage, input) => {
    const action = createCognitiveAction(input);
    assertActionDraftOnly(action);
    const ok = await persistAction(storage, action);
    set((state) => ({
      actions: [action, ...state.actions],
      persistWarning: ok ? state.persistWarning : true,
    }));
    return action;
  },
  listDrafts: () => get().actions.filter((action) => action.status === "draft"),
  dismissAction: async (storage, id) => {
    const existing = get().actions.find((row) => row.id === id);
    if (!existing || existing.status === "dismissed") {
      return;
    }
    const updated: CognitiveAction = { ...existing, status: "dismissed" };
    const ok = await persistAction(storage, updated);
    set((state) => ({
      actions: state.actions.map((row) => (row.id === id ? updated : row)),
      persistWarning: ok ? state.persistWarning : true,
    }));
  },
  confirmAction: async (storage, id, userEvent) => {
    try {
      assertUserConfirmedAction(userEvent);
    } catch (error) {
      if (error instanceof ActionDraftGuardError) {
        throw error;
      }
      throw new ActionDraftGuardError("confirmAction blocked");
    }
    if (userEvent.actionId !== id) {
      throw new ActionDraftGuardError("user_confirm actionId mismatch");
    }
    const existing = get().actions.find((row) => row.id === id);
    if (!existing) {
      throw new ActionDraftGuardError(`CognitiveAction ${id} not found`);
    }
    assertConfirmableDraft(existing);
    const updated: CognitiveAction = { ...existing, status: "confirmed" };
    assertActionDraftOnly(updated, { userEvent });
    const ok = await persistAction(storage, updated);
    set((state) => ({
      actions: state.actions.map((row) => (row.id === id ? updated : row)),
      persistWarning: ok ? state.persistWarning : true,
    }));
    return updated;
  },
  clear: () => set({ actions: [], loaded: false, persistWarning: false }),
}));
