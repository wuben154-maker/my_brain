import { create } from "zustand";
import { DEFAULT_USER_PROFILE, type UserProfile } from "@/domain/profile";
import {
  applyProfileCorrectionPatch,
  restoreProfileSnapshot,
  snapshotProfile,
  type ProfileCorrection,
  type ProfileCorrectionPatch,
  type ProfileCorrectionUndoSnapshot,
} from "@/domain/profile/userProfile";
import type { StorageProvider } from "@/storage/types";

interface ProfileState {
  profile: UserProfile;
  isLoaded: boolean;
  lastDistilledAt: string | null;
  corrections: ProfileCorrection[];
  lastCorrection: ProfileCorrectionUndoSnapshot | null;
  persistWarning: boolean;
  setProfile: (profile: UserProfile) => void;
  markDistilled: (updatedAt: string) => void;
  applyCorrection: (
    patch: ProfileCorrectionPatch,
    storage?: StorageProvider | null,
  ) => Promise<void>;
  undoLastCorrection: (storage?: StorageProvider | null) => Promise<void>;
  loadFromStorage: (storage: StorageProvider) => Promise<void>;
  reset: () => void;
}

async function persistProfile(
  storage: StorageProvider | null | undefined,
  profile: UserProfile,
): Promise<boolean> {
  if (!storage) {
    return false;
  }
  try {
    await storage.saveUserProfile(profile);
    return true;
  } catch {
    return false;
  }
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: DEFAULT_USER_PROFILE,
  isLoaded: false,
  lastDistilledAt: null,
  corrections: [],
  lastCorrection: null,
  persistWarning: false,
  setProfile: (profile) => set({ profile, isLoaded: true }),
  markDistilled: (updatedAt) => set({ lastDistilledAt: updatedAt }),
  applyCorrection: async (patch, storage) => {
    const state = get();
    const undoSnapshot: ProfileCorrectionUndoSnapshot = {
      profile: snapshotProfile(state.profile),
      corrections: [...state.corrections],
      correctedFields: [...(state.profile.correctedFields ?? [])],
    };
    const { profile: nextProfile, corrections: newCorrections } =
      applyProfileCorrectionPatch(state.profile, patch);
    if (newCorrections.length === 0) {
      return;
    }
    const mergedCorrections = [...state.corrections, ...newCorrections];
    set({
      profile: nextProfile,
      corrections: mergedCorrections,
      lastCorrection: undoSnapshot,
      isLoaded: true,
    });
    const persisted = await persistProfile(storage, nextProfile);
    if (!persisted) {
      set({ persistWarning: true });
    }
  },
  undoLastCorrection: async (storage) => {
    const state = get();
    const snapshot = state.lastCorrection;
    if (!snapshot) {
      return;
    }
    const restored = restoreProfileSnapshot(snapshot.profile);
    set({
      profile: restored,
      corrections: snapshot.corrections,
      lastCorrection: null,
      isLoaded: true,
    });
    const persisted = await persistProfile(storage, restored);
    if (!persisted) {
      set({ persistWarning: true });
    }
  },
  loadFromStorage: async (storage) => {
    const profile = await storage.loadUserProfile();
    set({ profile, isLoaded: true, persistWarning: false });
  },
  reset: () =>
    set({
      profile: DEFAULT_USER_PROFILE,
      isLoaded: false,
      lastDistilledAt: null,
      corrections: [],
      lastCorrection: null,
      persistWarning: false,
    }),
}));
