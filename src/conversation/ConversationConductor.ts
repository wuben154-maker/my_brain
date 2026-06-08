import { buildConversationContext } from "@/conversation/buildContext";
import {
  appendTranscriptTail,
  createEmptyWorking,
  shrinkWorkingOnInterrupt,
  shrinkWorkingOnStateChange,
  workingContextFootprint,
  type WorkingContext,
} from "@/conversation/contextTiers";
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
  recallMemories?: (input: {
    query: string;
    state: ConversationState;
  }) => Promise<string | undefined>;
  onTurn?: (turn: Turn) => void;
  onContextPatch?: (patch: {
    newsCursor?: number;
    onboarding?: ConversationContext["onboarding"];
  }) => void;
}

export class ConversationConductor {
  private state: ConversationState = "idle_chat";
  private started = false;
  private readonly working: WorkingContext = createEmptyWorking();
  /** Serializes dispatch so in-flight userSpeak cannot overwrite interrupt shrink. */
  private dispatchChain: Promise<unknown> = Promise.resolve();

  constructor(private readonly deps: ConversationConductorDeps) {}

  getState(): ConversationState {
    return this.state;
  }

  getWorkingContext(): WorkingContext {
    return this.working;
  }

  /** Footprint of volatile working tier (for tests / budget checks). */
  getWorkingFootprint(): number {
    return workingContextFootprint(this.working);
  }

  reset(): void {
    this.state = "idle_chat";
    this.started = false;
    this.dispatchChain = Promise.resolve();
    this.working.state = "idle_chat";
    this.working.transcriptTail = "";
    this.working.activeNewsId = undefined;
    this.working.walkthroughNodeIds = [];
    this.working.pack = null;
  }

  private async resolveContext(packQuery?: string): Promise<ConversationContext> {
    const base = this.deps.getContext();
    let recalledMemories = base.recalledMemories;
    if (!recalledMemories && this.deps.recallMemories) {
      const memoryQuery =
        packQuery?.trim() ||
        this.working.transcriptTail.trim() ||
        base.newsQueue[base.newsCursor]?.title?.trim() ||
        base.profile.interests.slice(0, 3).join(" ");
      if (memoryQuery) {
        recalledMemories = await this.deps.recallMemories({
          query: memoryQuery,
          state: this.state,
        });
      }
    }
    return buildConversationContext({
      newsQueue: base.newsQueue,
      newsCursor: base.newsCursor,
      graph: base.graph,
      profile: base.profile,
      onboarding: base.onboarding,
      recalledMemories,
      conversationState: this.state,
      working: this.working,
    });
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
    const run = this.dispatchChain.then(() =>
      this.dispatchBody(event, options),
    );
    this.dispatchChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async dispatchBody(
    event: ConversationEvent,
    options?: { speak?: boolean },
  ): Promise<Turn> {
    const prevState = this.state;

    if (event.type === "userInterrupt") {
      shrinkWorkingOnInterrupt(this.working);
      await this.deps.voice.interrupt();
    }

    if (event.type === "userSpeak") {
      appendTranscriptTail(this.working, `用户：${event.transcript}`);
    }

    const packQuery =
      event.type === "userSpeak" ? event.transcript : undefined;
    const ctx = await this.resolveContext(packQuery);

    const turn = await nextTurn(this.state, event, ctx, this.deps.llm);
    const nextState = turn.nextState ?? this.state;

    if (nextState !== prevState) {
      shrinkWorkingOnStateChange(prevState, nextState, this.working);
    }
    this.state = nextState;
    this.working.state = nextState;

    if (turn.highlightNodeIds && turn.highlightNodeIds.length > 0) {
      this.working.walkthroughNodeIds = [...turn.highlightNodeIds];
    }

    if (turn.say.trim().length > 0) {
      appendTranscriptTail(this.working, `助手：${turn.say}`);
    }

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
