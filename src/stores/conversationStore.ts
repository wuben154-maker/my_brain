import { create } from "zustand";
import type { ConversationState } from "@/conversation/types";
import {
  DEFAULT_ONBOARDING,
  type OnboardingProgress,
} from "@/conversation/types";
import type { NewsItem } from "@/domain/news";

export interface ConversationTurnLine {
  role: "user" | "assistant";
  text: string;
  at: string;
}

interface ConversationStoreState {
  turns: ConversationTurnLine[];
  currentState: ConversationState;
  currentNewsItem: NewsItem | null;
  newsCursor: number;
  onboarding: OnboardingProgress;
  setState: (currentState: ConversationState) => void;
  setNewsCursor: (newsCursor: number) => void;
  setOnboarding: (onboarding: OnboardingProgress) => void;
  setCurrentNewsItem: (item: NewsItem | null) => void;
  appendTurn: (role: "user" | "assistant", text: string) => void;
  reset: () => void;
}

export const useConversationStore = create<ConversationStoreState>((set) => ({
  turns: [],
  currentState: "idle_chat",
  currentNewsItem: null,
  newsCursor: 0,
  onboarding: DEFAULT_ONBOARDING,
  setState: (currentState) => set({ currentState }),
  setNewsCursor: (newsCursor) => set({ newsCursor }),
  setOnboarding: (onboarding) => set({ onboarding }),
  setCurrentNewsItem: (currentNewsItem) => set({ currentNewsItem }),
  appendTurn: (role, text) =>
    set((state) => ({
      turns: [
        ...state.turns,
        { role, text, at: new Date().toISOString() },
      ],
    })),
  reset: () =>
    set({
      turns: [],
      currentState: "idle_chat",
      currentNewsItem: null,
      newsCursor: 0,
      onboarding: DEFAULT_ONBOARDING,
    }),
}));
