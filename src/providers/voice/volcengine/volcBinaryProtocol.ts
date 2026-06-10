import { VOLC_CLIENT_EVENT } from "./volcRealtimeConstants";

const PROTOCOL_VERSION = 0b0001;
const HEADER_SIZE = 0b0001;

export const MESSAGE_TYPE = {
  fullClientRequest: 0b0001,
  audioOnlyRequest: 0b0010,
  fullServerResponse: 0b1001,
  audioOnlyResponse: 0b1011,
  error: 0b1111,
} as const;

export const MESSAGE_FLAGS = {
  none: 0b0000,
  hasSequence: 0b0001,
  lastNoSequence: 0b0010,
  lastNegativeSequence: 0b0011,
  hasEvent: 0b0100,
} as const;

export const SERIALIZATION = {
  raw: 0b0000,
  json: 0b0001,
} as const;

export interface VolcDecodedFrame {
  messageType: number;
  eventId?: number;
  sessionId?: string;
  payload: Uint8Array;
  errorCode?: number;
}

function writeHeader(
  messageType: number,
  flags: number,
  serialization: number,
): Uint8Array {
  const header = new Uint8Array(4);
  header[0] = (PROTOCOL_VERSION << 4) | HEADER_SIZE;
  header[1] = (messageType << 4) | flags;
  header[2] = serialization << 4;
  header[3] = 0;
  return header;
}

function writeUint32BE(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, value >>> 0, false);
  return bytes;
}

function writeStringUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function concatParts(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }
  return merged;
}

/** Encode a JSON client event frame (StartConnection / StartSession / ClientInterrupt). */
export function encodeJsonClientEvent(input: {
  eventId: number;
  sessionId?: string;
  payload: Record<string, unknown> | Record<string, unknown>[];
}): Uint8Array {
  const jsonPayload = writeStringUtf8(JSON.stringify(input.payload));
  const parts: Uint8Array[] = [
    writeHeader(
      MESSAGE_TYPE.fullClientRequest,
      MESSAGE_FLAGS.hasEvent,
      SERIALIZATION.json,
    ),
    writeUint32BE(input.eventId),
  ];

  if (input.sessionId) {
    const sessionBytes = writeStringUtf8(input.sessionId);
    parts.push(writeUint32BE(sessionBytes.length));
    parts.push(sessionBytes);
  }

  parts.push(writeUint32BE(jsonPayload.length));
  parts.push(jsonPayload);
  return concatParts(parts);
}

/** Encode PCM audio chunk for TaskRequest (event 200). */
export function encodeAudioTaskRequest(input: {
  sessionId: string;
  pcmChunk: Uint8Array;
}): Uint8Array {
  const sessionBytes = writeStringUtf8(input.sessionId);
  const parts = [
    writeHeader(
      MESSAGE_TYPE.audioOnlyRequest,
      MESSAGE_FLAGS.hasEvent,
      SERIALIZATION.raw,
    ),
    writeUint32BE(VOLC_CLIENT_EVENT.taskRequest),
    writeUint32BE(sessionBytes.length),
    sessionBytes,
    writeUint32BE(input.pcmChunk.length),
    input.pcmChunk,
  ];
  return concatParts(parts);
}

export function encodeStartConnection(): Uint8Array {
  return encodeJsonClientEvent({
    eventId: VOLC_CLIENT_EVENT.startConnection,
    payload: {},
  });
}

export function encodeClientInterrupt(sessionId: string): Uint8Array {
  return encodeJsonClientEvent({
    eventId: VOLC_CLIENT_EVENT.clientInterrupt,
    sessionId,
    payload: {},
  });
}

export function buildStartSessionPayload(input: {
  model: string;
  botName?: string;
  systemRole?: string;
  speakingStyle?: string;
}): Record<string, unknown> {
  return {
    asr: {
      extra: {
        end_smooth_window_ms: 1500,
        enable_custom_vad: false,
        enable_asr_twopass: false,
      },
    },
    tts: {
      audio_config: {
        speech_rate: 0,
        loudness_rate: 0,
      },
    },
    dialog: {
      bot_name: input.botName ?? "my_brain",
      system_role:
        input.systemRole ??
        "你是 my_brain，用户的 AI 大脑伴侣。用自然的中文口语交流，技术术语保留英文原词。",
      speaking_style: input.speakingStyle ?? "你回答简洁，像朋友聊天。",
      dialog_id: "",
      extra: {
        strict_audit: true,
        model: input.model,
      },
    },
  };
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint32(offset, false);
}

function eventCarriesSessionId(eventId: number | undefined): boolean {
  return eventId !== undefined && eventId >= 100;
}

/** Decode one server binary frame — best-effort for skeleton + tests. */
export function decodeVolcFrame(buffer: ArrayBuffer | Uint8Array): VolcDecodedFrame {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < 8) {
    throw new Error("Volc frame too short");
  }

  const messageType = (bytes[1] & 0xf0) >> 4;
  const flags = bytes[1] & 0x0f;
  let offset = 4;

  let eventId: number | undefined;
  if (flags === MESSAGE_FLAGS.hasEvent) {
    eventId = readUint32BE(bytes, offset);
    offset += 4;
  }

  let sessionId: string | undefined;
  if (eventCarriesSessionId(eventId) && offset + 4 <= bytes.length) {
    const sessionIdSize = readUint32BE(bytes, offset);
    offset += 4;
    if (sessionIdSize > 0 && offset + sessionIdSize <= bytes.length) {
      sessionId = new TextDecoder().decode(
        bytes.subarray(offset, offset + sessionIdSize),
      );
      offset += sessionIdSize;
    }
  }

  let errorCode: number | undefined;
  if (messageType === MESSAGE_TYPE.error && offset + 4 <= bytes.length) {
    errorCode = readUint32BE(bytes, offset);
    offset += 4;
  }

  const payloadSize =
    offset + 4 <= bytes.length ? readUint32BE(bytes, offset) : 0;
  offset += 4;
  const payload = bytes.subarray(offset, offset + payloadSize);

  return { messageType, eventId, sessionId, payload, errorCode };
}

export function parseJsonPayload<T>(payload: Uint8Array): T | null {
  if (payload.length === 0) {
    return null;
  }
  try {
    return JSON.parse(new TextDecoder().decode(payload)) as T;
  } catch {
    return null;
  }
}
