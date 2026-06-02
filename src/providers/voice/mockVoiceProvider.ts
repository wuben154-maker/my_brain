import type {
  VoiceConnectionState,
  VoiceProvider,
  VoiceProviderConfig,
  VoiceTranscriptEvent,
} from "./types";

const CONNECT_MS = 550;
const USER_STREAM_MS = 45;
const ASSISTANT_CHAR_MS = 28;
const PAUSE_BEFORE_REPLY_MS = 320;

export const MOCK_DEFAULT_UTTERANCE = "今天有什么 AI 资讯？";

const MOCK_GREETING =
  "Mock 语音已连接。点「模拟说话」或按住空格说话、松开发送；助手回复时可点「打断」。";

interface MockReplyContext {
  newsCount?: number;
}

/** Scripted voice loop for UI dev — no mic, no API. */
export class MockVoiceProvider implements VoiceProvider {
  readonly id = "mock-voice";

  private state: VoiceConnectionState = "idle";
  private stateListeners = new Set<(state: VoiceConnectionState) => void>();
  private transcriptListeners = new Set<
    (event: VoiceTranscriptEvent) => void
  >();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private generation = 0;
  private replyContext: MockReplyContext = {};

  async connect(config: VoiceProviderConfig): Promise<void> {
    void config;
    await this.disconnect();
    this.setState("connecting");
    await this.delay(CONNECT_MS);
    if (this.state !== "connecting") {
      return;
    }
    this.setState("listening");
    this.schedule(() => {
      void this.streamAssistant(MOCK_GREETING);
    }, 400);
  }

  async disconnect(): Promise<void> {
    this.generation += 1;
    this.clearTimers();
    this.setState("idle");
  }

  async interrupt(): Promise<void> {
    if (this.state !== "speaking") {
      return;
    }
    this.generation += 1;
    this.clearTimers();
    this.setState("listening");
  }

  getState(): VoiceConnectionState {
    return this.state;
  }

  onStateChange(listener: (state: VoiceConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onTranscript(listener: (event: VoiceTranscriptEvent) => void): () => void {
    this.transcriptListeners.add(listener);
    return () => this.transcriptListeners.delete(listener);
  }

  setReplyContext(context: MockReplyContext): void {
    this.replyContext = context;
  }

  /** Mock-only: simulate a user utterance (supports barge-in while assistant speaks). */
  simulateUserSpeech(text: string = MOCK_DEFAULT_UTTERANCE): void {
    const trimmed = text.trim();
    if (!trimmed || this.state === "idle" || this.state === "connecting") {
      return;
    }

    if (this.state === "speaking") {
      void this.interrupt().then(() => {
        void this.runUserTurn(trimmed);
      });
      return;
    }

    if (this.state === "listening") {
      void this.runUserTurn(trimmed);
    }
  }

  private async runUserTurn(text: string): Promise<void> {
    const turn = ++this.generation;
    await this.streamUser(text, turn);
    if (turn !== this.generation || this.getState() === "idle") {
      return;
    }
    await this.delay(PAUSE_BEFORE_REPLY_MS);
    if (turn !== this.generation || this.getState() === "idle") {
      return;
    }
    await this.streamAssistant(this.buildReply(text), turn);
  }

  private buildReply(userText: string): string {
    if (/入库|保存|加入大脑/.test(userText)) {
      return "这条讲的是 Transformer 上下文窗口扩展。要帮你整理成概念节点吗？入库前我会先问你确认。";
    }
    if (/资讯|新闻|github|趋势/i.test(userText)) {
      const count = this.replyContext.newsCount ?? 2;
      return `Mock 模式：今天有 ${count} 条候选资讯。我可以逐条用口语讲解，每条都会问你是否「入库?」。`;
    }
    if (/打断|barge/i.test(userText)) {
      return "没问题，你随时开口我就会停下。这是 MVP 必须的 barge-in 行为。";
    }
    return `收到：「${userText}」。这是 Mock 语音回复，用来验证转写气泡和状态切换。`;
  }

  private async streamUser(text: string, turn = this.generation): Promise<void> {
    let partial = "";
    for (const char of text) {
      if (turn !== this.generation) {
        return;
      }
      partial += char;
      this.emitTranscript({ role: "user", text: partial, final: false });
      await this.delay(USER_STREAM_MS);
    }
    if (turn !== this.generation) {
      return;
    }
    this.emitTranscript({ role: "user", text, final: true });
  }

  private async streamAssistant(text: string, turn = this.generation): Promise<void> {
    this.setState("speaking");
    let partial = "";
    for (const char of text) {
      if (turn !== this.generation || this.state !== "speaking") {
        return;
      }
      partial += char;
      this.emitTranscript({ role: "assistant", text: partial, final: false });
      await this.delay(ASSISTANT_CHAR_MS);
    }
    if (turn !== this.generation) {
      return;
    }
    this.emitTranscript({ role: "assistant", text, final: true });
    if (turn === this.generation) {
      this.setState("listening");
    }
  }

  private emitTranscript(event: VoiceTranscriptEvent): void {
    for (const listener of this.transcriptListeners) {
      listener(event);
    }
  }

  private setState(next: VoiceConnectionState): void {
    this.state = next;
    for (const listener of this.stateListeners) {
      listener(next);
    }
  }

  private schedule(fn: () => void, ms: number): void {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, ms);
    this.timers.add(id);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => this.schedule(resolve, ms));
  }

  private clearTimers(): void {
    for (const id of this.timers) {
      clearTimeout(id);
    }
    this.timers.clear();
  }
}

export function isMockVoiceProvider(
  provider: VoiceProvider,
): provider is MockVoiceProvider {
  return provider.id === "mock-voice";
}
