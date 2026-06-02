import { create } from "zustand";
import { DEFAULT_USER_PROFILE, type UserProfile } from "@/domain/profile";
import type { StorageProvider } from "@/storage/types";

interface ProfileState {
  profile: UserProfile;
  isLoaded: boolean;
  lastDistilledAt: string | null;
  setProfile: (profile: UserProfile) => void;
  markDistilled: (updatedAt: string) => void;
  loadFromStorage: (storage: StorageProvider) => Promise<void>;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: DEFAULT_USER_PROFILE,
  isLoaded: false,
  lastDistilledAt: null,
  setProfile: (profile) => set({ profile, isLoaded: true }),
  markDistilled: (updatedAt) => set({ lastDistilledAt: updatedAt }),
  loadFromStorage: async (storage) => {
    const profile = await storage.loadUserProfile();
    set({ profile, isLoaded: true });
  },
  reset: () =>
    set({
      profile: DEFAULT_USER_PROFILE,
      isLoaded: false,
      lastDistilledAt: null,
    }),
}));
