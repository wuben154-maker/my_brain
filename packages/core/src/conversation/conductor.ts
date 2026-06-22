import { buildMockExplainFallback } from "./explain.js";

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

export interface ApplyUserIntentOptions {
  /** Topic for explain_more — defaults to generic label when omitted. */
  explainTopic?: string;
  /** Optional context passed to explain_more resolution. */
  explainContext?: string;
  /** Pre-resolved explanation (e.g. from async LLM path). */
  precomputedExplanation?: string;
}

export function applyExplainMoreToState(
  state: ConversationState,
  explanation: string,
): IntentTransition {
  const next: ConversationState = {
    ...state,
    turns: [...state.turns],
    phase: "explaining",
    lastExplanation: explanation,
  };
  next.turns.push({ role: "assistant", text: explanation });
  return { state: next, assistantReply: explanation };
}

export function applyUserIntent(
  state: ConversationState,
  intent: UserIntent,
  options?: ApplyUserIntentOptions,
): IntentTransition {
  const next: ConversationState = { ...state, turns: [...state.turns] };

  if (intent === "explain_more") {
    const topic = options?.explainTopic ?? "当前话题";
    const explanation =
      options?.precomputedExplanation ??
      buildMockExplainFallback(topic, options?.explainContext);
    return applyExplainMoreToState(next, explanation);
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

export interface ExplainTopicContext {
  topic: string;
  context?: string;
}

export function resolveExplainTopicFromConversation(input: {
  activeSignalId: string | null;
  activeProvisionalId: string | null;
  signalTitles?: Array<{ id: string; title: string; summary?: string }>;
  provisionalSummaries?: Array<{ id: string; summary: string }>;
}): ExplainTopicContext {
  if (input.activeProvisionalId) {
    const provisional = input.provisionalSummaries?.find(
      (c) => c.id === input.activeProvisionalId,
    );
    if (provisional) {
      return { topic: provisional.summary.slice(0, 64), context: provisional.summary };
    }
  }

  if (input.activeSignalId) {
    const signal = input.signalTitles?.find((s) => s.id === input.activeSignalId);
    if (signal) {
      return {
        topic: signal.title.slice(0, 64),
        context: signal.summary ?? signal.title,
      };
    }
    return { topic: input.activeSignalId.slice(0, 64), context: input.activeSignalId };
  }

  return { topic: "当前话题" };
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

export {
  buildMockExplainFallback,
  resolveExplainMore,
} from "./explain.js";
export type {
  ExplainMoreInput,
  ExplainMoreResult,
  ExplainMoreSource,
} from "./explain.js";
