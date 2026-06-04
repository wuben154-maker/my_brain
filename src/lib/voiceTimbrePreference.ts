import type { VoiceTimbre } from "@/providers/voice/types";

const STORAGE_KEY = "my_brain.voiceTimbre";

const VALID: VoiceTimbre[] = [
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
];

export function readVoiceTimbrePreference(): VoiceTimbre | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return VALID.includes(raw as VoiceTimbre) ? (raw as VoiceTimbre) : null;
  } catch {
    return null;
  }
}

export function writeVoiceTimbrePreference(timbre: VoiceTimbre): void {
  try {
    localStorage.setItem(STORAGE_KEY, timbre);
  } catch {
    // local-first degrade — in-memory voice still updates
  }
}
