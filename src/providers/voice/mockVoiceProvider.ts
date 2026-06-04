import type {
  VoiceConnectionState,
  VoiceProvider,
  VoiceProviderConfig,
  VoiceSpeakProgressEvent,
  VoiceTimbre,
  VoiceTranscriptEvent,
} from "./types";

const CONNECT_MS = 550;
const USER_STREAM_MS = 45;
const ASSISTANT_CHAR_MS = 28;
const SPEAK_CHUNK_MS = 24;
const PAUSE_BEFORE_REPLY_MS = 320;
const SPEAK_CHUNK_CHARS = 6;

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
  private speakGeneration = 0;
  private timbre: VoiceTimbre = "alloy";
  private speakProgressListeners = new Set<
    (evt: VoiceSpeakProgressEvent) => void
  >();
  private replyContext: MockReplyContext = {};
  private sessionConnected = false;

  async connect(config: VoiceProviderConfig): Promise<void> {
    void config;
    await this.disconnect();
    this.setState("connecting");
    await this.delay(CONNECT_MS);
    if (this.state !== "connecting") {
      return;
    }
    this.sessionConnected = true;
    this.setState("listening");
    this.schedule(() => {
      void this.streamAssistant(MOCK_GREETING);
    }, 400);
  }

  async disconnect(): Promise<void> {
    this.generation += 1;
    this.speakGeneration += 1;
    this.sessionConnected = false;
    this.clearTimers();
    this.setState("idle");
  }

  async interrupt(): Promise<void> {
    if (this.state !== "speaking") {
      return;
    }
    this.generation += 1;
    this.speakGeneration += 1;
    this.clearTimers();
    this.setState(this.sessionConnected ? "listening" : "idle");
  }

  async speak(
    text: string,
    opts?: { interruptible?: boolean },
  ): Promise<void> {
    void opts;
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const turn = ++this.speakGeneration;
    this.generation += 1;
    this.clearTimers();

    if (this.state !== "idle" && this.state !== "listening") {
      return;
    }
    this.setState("speaking");

    const chunks: string[] = [];
    for (let i = 0; i < trimmed.length; i += SPEAK_CHUNK_CHARS) {
      chunks.push(trimmed.slice(i, i + SPEAK_CHUNK_CHARS));
    }

    let partial = "";
    for (const chunk of chunks) {
      if (turn !== this.speakGeneration) {
        return;
      }
      partial += chunk;
      this.emitSpeakProgress({ text: trimmed, chunk });
      this.emitTranscript({ role: "assistant", text: partial, final: false });
      await this.delay(SPEAK_CHUNK_MS);
    }

    if (turn !== this.speakGeneration) {
      return;
    }
    this.emitTranscript({ role: "assistant", text: trimmed, final: true });
    if (turn === this.speakGeneration) {
      this.setState(this.sessionConnected ? "listening" : "idle");
    }
  }

  setVoice(timbre: VoiceTimbre): void {
    this.timbre = timbre;
  }

  getVoice(): VoiceTimbre {
    return this.timbre;
  }

  onSpeakProgress(
    listener: (evt: VoiceSpeakProgressEvent) => void,
  ): () => void {
    this.speakProgressListeners.add(listener);
    return () => this.speakProgressListeners.delete(listener);
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

  private emitSpeakProgress(event: VoiceSpeakProgressEvent): void {
    for (const listener of this.speakProgressListeners) {
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
    return new Promise((resolve) => {
      const finish = () => {
        this.pendingDelayResolvers.delete(finish);
        resolve();
      };
      this.pendingDelayResolvers.add(finish);
      const id = setTimeout(() => {
        this.timers.delete(id);
        finish();
      }, ms);
      this.timers.add(id);
    });
  }

  private pendingDelayResolvers = new Set<() => void>();

  private clearTimers(): void {
    for (const id of this.timers) {
      clearTimeout(id);
    }
    this.timers.clear();
    for (const finish of this.pendingDelayResolvers) {
      finish();
    }
    this.pendingDelayResolvers.clear();
  }
}

export function isMockVoiceProvider(
  provider: VoiceProvider,
): provider is MockVoiceProvider {
  return provider.id === "mock-voice";
}
