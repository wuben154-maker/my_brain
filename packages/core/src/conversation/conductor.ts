export type ConversationPhase =
  | "idle"
  | "explaining"
  | "ingest_pending"
  | "provisional_pending"
  | "user_intent";

export type UserIntent = "ingest" | "skip" | "explain_more";

export interface ConversationTurn {
  role: "user" | "assistant";
  text: string;
}

export interface ConversationState {
  phase: ConversationPhase;
  turns: ConversationTurn[];
  activeSignalId: string | null;
  activeProvisionalId: string | null;
  lastExplanation: string | null;
}

export function createInitialConversationState(): ConversationState {
  return {
    phase: "idle",
    turns: [],
    activeSignalId: null,
    activeProvisionalId: null,
    lastExplanation: null,
  };
}

export interface IntentTransition {
  state: ConversationState;
  assistantReply: string;
}

export function applyUserIntent(
  state: ConversationState,
  intent: UserIntent,
): IntentTransition {
  const next: ConversationState = { ...state, turns: [...state.turns] };

  if (intent === "explain_more") {
    next.phase = "explaining";
    next.lastExplanation = "（演示）mock 讲细点：这是占位解释，不会自动入库。";
    next.turns.push({ role: "assistant", text: next.lastExplanation });
    return { state: next, assistantReply: next.lastExplanation };
  }

  if (intent === "skip") {
    next.phase = "idle";
    next.activeSignalId = null;
    next.activeProvisionalId = null;
    const reply = "好的，这次先不记。";
    next.turns.push({ role: "assistant", text: reply });
    return { state: next, assistantReply: reply };
  }

  next.phase = "ingest_pending";
  const reply = "收到，准备点亮这颗星…";
  next.turns.push({ role: "assistant", text: reply });
  return { state: next, assistantReply: reply };
}

export function selectAdaptiveSignal(state: ConversationState, signalId: string): ConversationState {
  return {
    ...state,
    phase: "user_intent",
    activeSignalId: signalId,
    activeProvisionalId: null,
  };
}

export function enterProvisionalPending(
  state: ConversationState,
  provisionalId: string,
): ConversationState {
  return {
    ...state,
    phase: "provisional_pending",
    activeProvisionalId: provisionalId,
    activeSignalId: null,
  };
}
