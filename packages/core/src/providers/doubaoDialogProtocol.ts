import { gzipSync, gunzipSync } from "fflate";

import {
  DEFAULT_DOUBAO_DIALOG_SESSION,
  type DoubaoDialogStartSessionPayload,
  VOLC_CLIENT_EVENT,
  VOLC_SERVER_EVENT,
} from "./volcDoubaoConstants.js";

export type { DoubaoDialogStartSessionPayload };
export { DEFAULT_DOUBAO_DIALOG_SESSION, VOLC_CLIENT_EVENT, VOLC_SERVER_EVENT };

const PROTOCOL_VERSION = 0b0001;
const HEADER_SIZE = 0b0001;

const MESSAGE_TYPE = {
  fullClientRequest: 0b0001,
  audioOnlyClientRequest: 0b0010,
  fullServerResponse: 0b1001,
  audioOnlyServerResponse: 0b1011,
  error: 0b1111,
} as const;

const MESSAGE_FLAGS = {
  hasEvent: 0b0100,
} as const;

const SERIALIZATION = {
  none: 0b0000,
  json: 0b0001,
} as const;

const COMPRESSION = {
  none: 0b0000,
  gzip: 0b0001,
} as const;

export interface ParsedDoubaoDialogFrame {
  eventId?: number;
  sessionId?: string;
  payloadJson?: unknown;
  audio?: Uint8Array;
  errorCode?: number;
}

function writeHeader(
  messageType: number,
  flags: number,
  serialization: number,
  compression: number,
): Uint8Array {
  const header = new Uint8Array(4);
  header[0] = (PROTOCOL_VERSION << 4) | HEADER_SIZE;
  header[1] = (messageType << 4) | flags;
  header[2] = (serialization << 4) | compression;
  header[3] = 0;
  return header;
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

function writeUint32BE(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, false);
  return bytes;
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
}

function encodeJsonPayload(json: unknown): Uint8Array {
  return gzipSync(new TextEncoder().encode(JSON.stringify(json)));
}

function decodePayload(bytes: Uint8Array, compression: number, serialization: number): unknown {
  const payload = compression === COMPRESSION.gzip ? gunzipSync(bytes) : bytes;
  if (serialization === SERIALIZATION.json) {
    return JSON.parse(new TextDecoder().decode(payload));
  }
  return payload;
}

function encodeFullClientEvent(
  eventId: number,
  sessionId: string | null,
  json: unknown,
): Uint8Array {
  const payload = encodeJsonPayload(json);
  const parts: Uint8Array[] = [
    writeHeader(
      MESSAGE_TYPE.fullClientRequest,
      MESSAGE_FLAGS.hasEvent,
      SERIALIZATION.json,
      COMPRESSION.gzip,
    ),
    writeUint32BE(eventId),
  ];
  if (sessionId) {
    const sessionBytes = new TextEncoder().encode(sessionId);
    parts.push(writeUint32BE(sessionBytes.length));
    parts.push(sessionBytes);
  }
  parts.push(writeUint32BE(payload.length));
  parts.push(payload);
  return concatParts(parts);
}

/** StartConnection — gzip JSON `{}`. */
export function encodeDoubaoStartConnection(): Uint8Array {
  return encodeFullClientEvent(VOLC_CLIENT_EVENT.startConnection, null, {});
}

export function encodeDoubaoStartSessionFrame(
  sessionId: string,
  payload: DoubaoDialogStartSessionPayload = DEFAULT_DOUBAO_DIALOG_SESSION,
): Uint8Array {
  return encodeFullClientEvent(VOLC_CLIENT_EVENT.startSession, sessionId, payload);
}

export function encodeDoubaoFinishSession(sessionId: string): Uint8Array {
  return encodeFullClientEvent(VOLC_CLIENT_EVENT.finishSession, sessionId, {});
}

export function encodeDoubaoFinishConnection(): Uint8Array {
  return encodeFullClientEvent(VOLC_CLIENT_EVENT.finishConnection, null, {});
}

/** Proactive greeting — triggers assistant TTS like Doubao phone call opening. */
export function encodeDoubaoSayHello(sessionId: string, content: string): Uint8Array {
  return encodeFullClientEvent(VOLC_CLIENT_EVENT.sayHello, sessionId, { content });
}

/** Stream mic PCM (16-bit LE) upstream. */
export function encodeDoubaoTaskRequest(sessionId: string, pcmAudio: Uint8Array): Uint8Array {
  const payload = gzipSync(pcmAudio);
  const sessionBytes = new TextEncoder().encode(sessionId);
  return concatParts([
    writeHeader(
      MESSAGE_TYPE.audioOnlyClientRequest,
      MESSAGE_FLAGS.hasEvent,
      SERIALIZATION.none,
      COMPRESSION.gzip,
    ),
    writeUint32BE(VOLC_CLIENT_EVENT.taskRequest),
    writeUint32BE(sessionBytes.length),
    sessionBytes,
    writeUint32BE(payload.length),
    payload,
  ]);
}

export function parseDoubaoDialogFrame(data: ArrayBuffer): ParsedDoubaoDialogFrame {
  const bytes = new Uint8Array(data);
  if (bytes.length < 4) {
    return {};
  }
  const headerSize = bytes[0] & 0x0f;
  const messageType = (bytes[1] >> 4) & 0x0f;
  const flags = bytes[1] & 0x0f;
  const serialization = (bytes[2] >> 4) & 0x0f;
  const compression = bytes[2] & 0x0f;
  let offset = headerSize * 4;

  const result: ParsedDoubaoDialogFrame = {};

  if (flags & MESSAGE_FLAGS.hasEvent) {
    if (bytes.length < offset + 4) {
      return result;
    }
    result.eventId = readUint32BE(bytes, offset);
    offset += 4;
  }

  if (messageType === MESSAGE_TYPE.error) {
    if (bytes.length >= offset + 4) {
      result.errorCode = readUint32BE(bytes, offset);
    }
    return result;
  }

  if (
    messageType === MESSAGE_TYPE.fullServerResponse ||
    messageType === MESSAGE_TYPE.audioOnlyServerResponse
  ) {
    if (bytes.length >= offset + 4) {
      const sessionLen = readUint32BE(bytes, offset);
      offset += 4;
      if (sessionLen > 0 && bytes.length >= offset + sessionLen) {
        result.sessionId = new TextDecoder().decode(bytes.subarray(offset, offset + sessionLen));
        offset += sessionLen;
      }
    }
    if (bytes.length >= offset + 4) {
      const payloadSize = readUint32BE(bytes, offset);
      offset += 4;
      if (bytes.length >= offset + payloadSize) {
        const payloadBytes = bytes.subarray(offset, offset + payloadSize);
        if (
          messageType === MESSAGE_TYPE.audioOnlyServerResponse ||
          result.eventId === VOLC_SERVER_EVENT.ttsResponse
        ) {
          result.audio =
            compression === COMPRESSION.gzip ? gunzipSync(payloadBytes) : payloadBytes;
        } else {
          result.payloadJson = decodePayload(payloadBytes, compression, serialization);
        }
      }
    }
  }

  return result;
}

export function extractAsrText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const results = (payload as { results?: Array<{ text?: string; is_interim?: boolean }> })
    .results;
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }
  const final = results.find((row) => row.is_interim !== true) ?? results[results.length - 1];
  return final?.text?.trim() ?? null;
}

export function extractChatText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const content = (payload as { content?: string }).content;
  return typeof content === "string" && content.trim() ? content.trim() : null;
}

// Back-compat alias for connection gate decode
export function decodeDoubaoVolcFrame(data: ArrayBuffer): {
  eventId?: number;
  errorCode?: number;
} {
  const frame = parseDoubaoDialogFrame(data);
  return { eventId: frame.eventId, errorCode: frame.errorCode };
}
