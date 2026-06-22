/** Volcengine / 豆包 realtime voice wire constants (documented). */
export const VOLC_REALTIME_WS_URL =
  "wss://openspeech.bytedance.com/api/v3/realtime/dialogue";

export const VOLC_REALTIME_APP_KEY = "PlgvMymc7f3tQnJ6";

export const VOLC_REALTIME_RESOURCE_ID = "volc.speech.dialog";

export const VOLC_CLIENT_EVENT = {
  startConnection: 1,
  finishConnection: 2,
  startSession: 100,
  finishSession: 102,
  taskRequest: 200,
  sayHello: 300,
} as const;

const KNOWN_DOUBAO_DIALOG_MODELS = new Set(["1.2.1.1", "2.2.0.0"]);

export const VOLC_SERVER_EVENT = {
  connectionStarted: 50,
  connectionFailed: 51,
  sessionStarted: 150,
  ttsResponse: 352,
  ttsSentenceStart: 350,
  ttsSentenceEnd: 351,
  ttsEnded: 359,
  asrResponse: 451,
  asrEnded: 459,
  chatResponse: 550,
  sessionFinished: 600,
} as const;

export interface DoubaoDialogStartSessionPayload {
  asr: {
    extra: {
      end_smooth_window_ms: number;
      enable_custom_vad: boolean;
      enable_asr_twopass: boolean;
    };
  };
  tts: {
    speaker?: string;
    audio_config: {
      channel: number;
      format: string;
      sample_rate: number;
      speech_rate: number;
      loudness_rate: number;
    };
  };
  dialog: {
    bot_name: string;
    system_role: string;
    speaking_style: string;
    dialog_id: string;
    extra: {
      strict_audit: boolean;
      model: string;
      /** Required when mic is muted during assistant TTS playback. */
      input_mod?: string;
    };
  };
}

export const DEFAULT_DOUBAO_DIALOG_MODEL = "1.2.1.1";

const DOUBAO_SC2_SPEAKER = "ICL_zh_female_tiexinnvyou_tob";
const DOUBAO_O2_SPEAKER = "zh_female_vv_jupiter_bigtts";

/** Map provider UI model strings to Volc dialog model ids. */
export function resolveDoubaoDialogModel(model?: string | null): string {
  const trimmed = model?.trim() ?? "";
  if (KNOWN_DOUBAO_DIALOG_MODELS.has(trimmed)) {
    return trimmed;
  }
  return DEFAULT_DOUBAO_DIALOG_MODEL;
}

/** Volc realtime dialog StartSession payload — model is required for live TTS replies. */
export function buildDoubaoDialogSessionPayload(
  model: string = DEFAULT_DOUBAO_DIALOG_MODEL,
): DoubaoDialogStartSessionPayload {
  const trimmedModel = resolveDoubaoDialogModel(model);
  const speaker =
    trimmedModel === "2.2.0.0" ? DOUBAO_SC2_SPEAKER : DOUBAO_O2_SPEAKER;
  return {
    asr: {
      extra: {
        end_smooth_window_ms: 1500,
        enable_custom_vad: false,
        enable_asr_twopass: false,
      },
    },
    tts: {
      speaker,
      audio_config: {
        channel: 1,
        format: "pcm_s16le",
        sample_rate: 24000,
        speech_rate: 0,
        loudness_rate: 0,
      },
    },
    dialog: {
      bot_name: "my_brain",
      system_role: "你是用户的本地优先 AI 知识伴侣，说话简洁自然，用中文交流。",
      speaking_style: "语速适中，语调自然，回答简短有信息量。",
      dialog_id: "",
      extra: {
        strict_audit: false,
        model: trimmedModel,
        input_mod: "keep_alive",
      },
    },
  };
}

/** @deprecated use buildDoubaoDialogSessionPayload() */
export const DEFAULT_DOUBAO_DIALOG_SESSION: DoubaoDialogStartSessionPayload =
  buildDoubaoDialogSessionPayload();
