export type VoiceFsmState =
  | "listening"
  | "thinking"
  | "speaking"
  | "interrupted"
  | "error";

export type VoiceFsmEvent =
  | { type: "start_listening" }
  | { type: "user_utterance_end" }
  | { type: "assistant_reply_start" }
  | { type: "assistant_reply_end" }
  | { type: "barge_in" }
  | { type: "transport_error"; message: string }
  | { type: "reset" };

export interface VoiceSessionSnapshot {
  state: VoiceFsmState;
  lastError: string | null;
}

export function createInitialVoiceSnapshot(): VoiceSessionSnapshot {
  return { state: "listening", lastError: null };
}

export function reduceVoiceFsm(
  snapshot: VoiceSessionSnapshot,
  event: VoiceFsmEvent,
): VoiceSessionSnapshot {
  switch (event.type) {
    case "start_listening":
      return { state: "listening", lastError: null };
    case "user_utterance_end":
      if (snapshot.state === "listening" || snapshot.state === "interrupted") {
        return { state: "thinking", lastError: null };
      }
      return snapshot;
    case "assistant_reply_start":
      if (snapshot.state === "thinking" || snapshot.state === "listening") {
        return { state: "speaking", lastError: null };
      }
      return snapshot;
    case "assistant_reply_end":
      if (snapshot.state === "speaking" || snapshot.state === "interrupted") {
        return { state: "listening", lastError: null };
      }
      return snapshot;
    case "barge_in":
      if (snapshot.state === "speaking") {
        return { state: "interrupted", lastError: null };
      }
      return snapshot;
    case "transport_error":
      return { state: "error", lastError: event.message };
    case "reset":
      return createInitialVoiceSnapshot();
    default:
      return snapshot;
  }
}
