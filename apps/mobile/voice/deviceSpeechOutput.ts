import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import { Platform } from "react-native";
import Tts from "react-native-tts";

let speaking = false;
let audioModeReady = false;
let ttsInitialized = false;
const listeners = new Set<(playing: boolean) => void>();

function setSpeaking(next: boolean) {
  speaking = next;
  listeners.forEach((listener) => listener(next));
}

async function ensurePlaybackAudioMode(): Promise<void> {
  if (audioModeReady) {
    return;
  }
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  audioModeReady = true;
}

async function ensureNativeTts(): Promise<void> {
  if (ttsInitialized || Platform.OS !== "android") {
    return;
  }
  try {
    await Tts.setDefaultLanguage("zh-CN");
  } catch {
    try {
      await Tts.setDefaultLanguage("zh");
    } catch {
      // fall back to device default engine language
    }
  }
  Tts.setDucking(true);
  ttsInitialized = true;
}

function speakWithExpo(text: string, onDone?: () => void): void {
  void Speech.stop();
  Speech.speak(text, {
    language: "zh-CN",
    pitch: 1,
    rate: 0.95,
    onStart: () => setSpeaking(true),
    onDone: () => {
      setSpeaking(false);
      onDone?.();
    },
    onStopped: () => {
      setSpeaking(false);
      onDone?.();
    },
    onError: () => {
      setSpeaking(false);
      onDone?.();
    },
  });
}

function speakWithReactNativeTts(text: string, onDone?: () => void): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (spoken: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      Tts.removeAllListeners("tts-start");
      Tts.removeAllListeners("tts-finish");
      Tts.removeAllListeners("tts-cancel");
      setSpeaking(false);
      onDone?.();
      resolve(spoken);
    };

    Tts.addEventListener("tts-start", () => setSpeaking(true));
    Tts.addEventListener("tts-finish", () => finish(true));
    Tts.addEventListener("tts-cancel", () => finish(false));

    try {
      Tts.stop();
      Tts.speak(text);
    } catch {
      finish(false);
      return;
    }

    setTimeout(() => finish(false), Math.min(60_000, Math.max(8_000, text.length * 120)));
  });
}

export async function speakDeviceText(text: string, onDone?: () => void): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) {
    onDone?.();
    return;
  }

  await ensurePlaybackAudioMode();

  if (Platform.OS === "android") {
    await ensureNativeTts();
    const spoke = await speakWithReactNativeTts(trimmed, onDone);
    if (spoke) {
      return;
    }
  }

  speakWithExpo(trimmed, onDone);
}

export function stopDeviceSpeech(): void {
  if (Platform.OS === "android") {
    void Tts.stop();
  }
  void Speech.stop();
  setSpeaking(false);
}

export function isDeviceSpeechPlaying(): boolean {
  return speaking;
}

export function onDeviceSpeechStateChange(cb: (playing: boolean) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
