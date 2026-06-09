import { create } from "zustand";
import type { InterviewQuestion } from "@/domain/actions/interviewQuestion";

interface InterviewState {
  active: boolean;
  questions: InterviewQuestion[];
  cursor: number;
  skippedIds: string[];
  start: (questions: InterviewQuestion[]) => void;
  skip: () => void;
  next: () => void;
  reset: () => void;
  finish: () => void;
  getCurrentQuestion: () => InterviewQuestion | null;
  isComplete: () => boolean;
}

export const useInterviewStore = create<InterviewState>((set, get) => ({
  active: false,
  questions: [],
  cursor: 0,
  skippedIds: [],
  start: (questions) =>
    set({
      active: true,
      questions,
      cursor: 0,
      skippedIds: [],
    }),
  skip: () => {
    const state = get();
    const current = state.questions[state.cursor];
    if (!state.active || !current) {
      return;
    }
    const skippedIds = state.skippedIds.includes(current.id)
      ? state.skippedIds
      : [...state.skippedIds, current.id];
    const cursor = Math.min(state.cursor + 1, state.questions.length);
    set({
      skippedIds,
      cursor,
      active: cursor < state.questions.length,
    });
  },
  next: () => {
    const state = get();
    if (!state.active) {
      return;
    }
    const cursor = Math.min(state.cursor + 1, state.questions.length);
    set({
      cursor,
      active: cursor < state.questions.length,
    });
  },
  reset: () =>
    set({
      active: false,
      questions: [],
      cursor: 0,
      skippedIds: [],
    }),
  finish: () => {
    const state = get();
    set({
      active: false,
      cursor: state.questions.length,
    });
  },
  getCurrentQuestion: () => {
    const state = get();
    if (!state.active || state.cursor >= state.questions.length) {
      return null;
    }
    return state.questions[state.cursor] ?? null;
  },
  isComplete: () => {
    const state = get();
    return state.questions.length > 0 && state.cursor >= state.questions.length;
  },
}));
