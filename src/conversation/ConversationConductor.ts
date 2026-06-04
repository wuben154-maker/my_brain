import { buildConversationContext } from "@/conversation/buildContext";
import {
  nextNewsCursorAfterIngest,
  nextOnboardingAfterEvent,
  nextTurn,
} from "@/conversation/nextTurn";
import type {
  ConversationContext,
  ConversationEvent,
  ConversationState,
  Turn,
} from "@/conversation/types";
import type { LlmProvider } from "@/providers/llm/types";
import type { VoiceProvider } from "@/providers/voice/types";

export interface ConversationConductorDeps {
  llm: LlmProvider;
  voice: VoiceProvider;
  getContext: () => ConversationContext;
  onTurn?: (turn: Turn) => void;
  onContextPatch?: (patch: {
    newsCursor?: number;
    onboarding?: ConversationContext["onboarding"];
  }) => void;
}

export class ConversationConductor {
  private state: ConversationState = "idle_chat";
  private started = false;

  constructor(private readonly deps: ConversationConductorDeps) {}

  getState(): ConversationState {
    return this.state;
  }

  reset(): void {
    this.state = "idle_chat";
    this.started = false;
  }

  async start(options?: { speak?: boolean }): Promise<Turn | null> {
    if (this.started) {
      return null;
    }
    this.started = true;
    return this.dispatch({ type: "sessionStart" }, options);
  }

  async dispatch(
    event: ConversationEvent,
    options?: { speak?: boolean },
  ): Promise<Turn> {
    const ctx = this.deps.getContext();

    if (event.type === "userInterrupt") {
      await this.deps.voice.interrupt();
    }

    const turn = await nextTurn(this.state, event, ctx, this.deps.llm);
    const nextState = turn.nextState ?? this.state;
    this.state = nextState;

    const onboarding = nextOnboardingAfterEvent(ctx, event);
    const newsCursor = nextNewsCursorAfterIngest(
      { ...ctx, onboarding },
      event,
    );
    if (
      onboarding !== ctx.onboarding ||
      newsCursor !== ctx.newsCursor
    ) {
      this.deps.onContextPatch?.({ onboarding, newsCursor });
    }

    this.deps.onTurn?.(turn);

    const shouldSpeak = options?.speak !== false;
    if (shouldSpeak && turn.say.trim().length > 0) {
      await this.deps.voice.speak(turn.say, { interruptible: true });
    }

    return turn;
  }
}

export function createConversationConductor(
  deps: ConversationConductorDeps,
): ConversationConductor {
  return new ConversationConductor(deps);
}

export { buildConversationContext, nextTurn };
