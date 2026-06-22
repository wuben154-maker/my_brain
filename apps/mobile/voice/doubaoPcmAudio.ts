import { ExpoPlayAudioStream, Pipeline } from "@edkimmel/expo-audio-stream";
import { Audio } from "expo-av";

let doubaoAudioModeReady = false;
let pipelineErrorUnsub: { remove: () => void } | null = null;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export interface DoubaoMicSession {
  stop: () => Promise<void>;
}

/** 16 kHz mono PCM16 mic capture for Doubao TaskRequest upstream. */
export async function startDoubaoMicCapture(
  onPcmChunk: (pcm: Uint8Array) => void,
): Promise<DoubaoMicSession> {
  await ensureDoubaoAudioSession();
  const { subscription } = await ExpoPlayAudioStream.startMicrophone({
    sampleRate: 16000,
    channels: 1,
    encoding: "pcm_16bit",
    interval: 20,
    onAudioStream: async (event) => {
      const raw = event.data;
      if (typeof raw !== "string" || !raw) {
        return;
      }
      const binary = atob(raw);
      const pcm = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        pcm[i] = binary.charCodeAt(i);
      }
      onPcmChunk(pcm);
    },
  });

  return {
    stop: async () => {
      subscription?.remove();
      await ExpoPlayAudioStream.stopMicrophone();
    },
  };
}

/** Speaker + mic session mode before native pipeline/mic start. */
export async function ensureDoubaoAudioSession(): Promise<void> {
  if (doubaoAudioModeReady) {
    return;
  }
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  doubaoAudioModeReady = true;
}

export async function connectDoubaoPlaybackPipeline(): Promise<void> {
  await ensureDoubaoAudioSession();
  pipelineErrorUnsub?.remove();
  pipelineErrorUnsub = Pipeline.onError(({ code, message }) => {
    if (__DEV__) {
      console.warn("[doubao-audio] pipeline error", code, message);
    }
  });
  await Pipeline.connect({
    sampleRate: 24000,
    channelCount: 1,
    targetBufferMs: 80,
    audioMode: "duckOthers",
  });
  if (__DEV__) {
    console.log("[doubao-audio] pipeline connected", Pipeline.getState());
  }
}

export function pushDoubaoTtsChunk(
  pcm: Uint8Array,
  turnId: string,
  opts: { isFirstChunk?: boolean; isLastChunk?: boolean } = {},
): void {
  const pushed = Pipeline.pushAudioSync({
    audio: bytesToBase64(pcm),
    turnId,
    isFirstChunk: opts.isFirstChunk,
    isLastChunk: opts.isLastChunk,
  });
  if (!pushed && __DEV__) {
    console.warn("[doubao-audio] pushAudioSync failed", turnId);
  }
}

export async function invalidateDoubaoPlaybackTurn(turnId: string): Promise<void> {
  await Pipeline.invalidateTurn({ turnId });
}

export async function teardownDoubaoAudio(): Promise<void> {
  pipelineErrorUnsub?.remove();
  pipelineErrorUnsub = null;
  try {
    await ExpoPlayAudioStream.stopMicrophone();
  } catch {
    // mic may already be stopped
  }
  try {
    await Pipeline.disconnect();
  } catch {
    // pipeline may already be torn down
  }
  doubaoAudioModeReady = false;
}

export function muteDoubaoMic(muted: boolean): void {
  ExpoPlayAudioStream.toggleSilence(muted);
}
