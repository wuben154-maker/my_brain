/** Volcengine / 豆包端到端实时语音 — documented wire constants (see volc docs 6561/1594356). */

export const VOLC_REALTIME_WS_URL =
  "wss://openspeech.bytedance.com/api/v3/realtime/dialogue";

/** Documented fixed header value for X-Api-App-Key. */
export const VOLC_REALTIME_APP_KEY = "PlgvMymc7f3tQnJ6";

export const VOLC_REALTIME_RESOURCE_ID = "volc.speech.dialog";

/** Supported model versions per StartSession.dialog.extra.model. */
export const VOLC_REALTIME_MODEL_VERSIONS = ["1.2.1.1", "2.2.0.0"] as const;

export type VolcRealtimeModelVersion =
  (typeof VOLC_REALTIME_MODEL_VERSIONS)[number];

export const DEFAULT_VOLC_REALTIME_MODEL: VolcRealtimeModelVersion = "2.2.0.0";

/** Client events (documented event IDs). */
export const VOLC_CLIENT_EVENT = {
  startConnection: 1,
  finishConnection: 2,
  startSession: 100,
  finishSession: 102,
  taskRequest: 200,
  clientInterrupt: 515,
} as const;

/** Server events used by the adapter skeleton. */
export const VOLC_SERVER_EVENT = {
  connectionStarted: 50,
  connectionFailed: 51,
  sessionStarted: 150,
  sessionFinished: 152,
  asrInfo: 450,
  asrResponse: 451,
  ttsResponse: 352,
} as const;

/** Input audio: PCM s16le mono 16kHz (documented upload format). */
export const VOLC_INPUT_AUDIO = {
  format: "pcm_s16le",
  sampleRate: 16_000,
  channels: 1,
} as const;

/** Output audio default: PCM s16le mono 24kHz. */
export const VOLC_OUTPUT_AUDIO = {
  format: "pcm_s16le",
  sampleRate: 24_000,
  channels: 1,
} as const;
