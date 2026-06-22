/**
 * Live Doubao dialog probe — run:
 *   $env:RUN_DOUBAO_PROBE=1; pnpm -w exec vitest run packages/core/src/providers/doubaoVoiceE2e.probe.test.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import WebSocket from "ws";
import { describe, expect, it } from "vitest";

import {
  VOLC_REALTIME_WS_URL,
  VOLC_SERVER_EVENT,
  buildDoubaoDialogSessionPayload,
  resolveDoubaoDialogModel,
} from "./volcDoubaoConstants.js";
import {
  encodeDoubaoSayHello,
  encodeDoubaoStartConnection,
  encodeDoubaoStartSessionFrame,
  encodeDoubaoTaskRequest,
  parseDoubaoDialogFrame,
} from "./doubaoDialogProtocol.js";
import { buildDoubaoConnectHeaders } from "./doubaoVoiceConnectionTest.js";

function loadLocalEnv(): Record<string, string> {
  const envPath = resolve(process.cwd(), ".env.local");
  const out: Record<string, string> = {};
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return out;
}

function silencePcm20ms(): Uint8Array {
  return new Uint8Array(640);
}

async function pumpSilence(
  send: (frame: Uint8Array) => void,
  sessionId: string,
  durationMs: number,
): Promise<void> {
  const endAt = Date.now() + durationMs;
  while (Date.now() < endAt) {
    send(encodeDoubaoTaskRequest(sessionId, silencePcm20ms()));
    await new Promise((r) => setTimeout(r, 20));
  }
}

const eventNames = Object.fromEntries(
  Object.entries(VOLC_SERVER_EVENT).map(([k, v]) => [v, k]),
);

describe("doubao voice live probe", () => {
  for (const model of ["2.2.0.0", "1.2.1.1"] as const) {
    it.skipIf(!process.env.RUN_DOUBAO_PROBE)(`[${model}] SayHello + silence stream returns TTS`, async () => {
      const env = loadLocalEnv();
      const appId = env.DOUBAO_VOICE_APP_ID;
      const accessToken = env.DOUBAO_VOICE_ACCESS_TOKEN;
      expect(appId && accessToken).toBeTruthy();

      const ttsBytes = await runProbe({
        appId,
        accessToken,
        model: resolveDoubaoDialogModel(model),
        mode: "sayHello",
      });
      expect(ttsBytes).toBeGreaterThan(0);
    }, 60_000);
  }
});

async function runProbe(input: {
  appId: string;
  accessToken: string;
  model: string;
  mode: "sayHello" | "mic";
}): Promise<number> {
  return new Promise<number>((resolvePromise, reject) => {
    const headers = buildDoubaoConnectHeaders({
      appId: input.appId,
      accessToken: input.accessToken,
      connectId: crypto.randomUUID(),
    });
    const ws = new WebSocket(VOLC_REALTIME_WS_URL, { headers });
    let sessionId: string | null = null;
    let totalTts = 0;
    let started = false;
    let pumpStop = false;
    const events: string[] = [];

    const timer = setTimeout(() => {
      pumpStop = true;
      ws.close();
      reject(new Error(`timeout totalTts=${totalTts} events=${events.join(" -> ")}`));
    }, 45_000);

    const send = (frame: Uint8Array) => {
      ws.send(Buffer.from(frame.buffer, frame.byteOffset, frame.byteLength));
    };

    ws.on("open", () => send(encodeDoubaoStartConnection()));

    ws.on("message", (data: Buffer) => {
      void (async () => {
        const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        const frame = parseDoubaoDialogFrame(buf);
        const label = frame.eventId != null ? eventNames[frame.eventId] ?? frame.eventId : "raw";
        events.push(String(label));
        if (frame.errorCode != null) {
          pumpStop = true;
          clearTimeout(timer);
          reject(
            new Error(
              `server error ${frame.errorCode} after [${events.join(" -> ")}] json=${JSON.stringify(frame.payloadJson ?? null)}`,
            ),
          );
          ws.close();
          return;
        }
        if (frame.eventId === VOLC_SERVER_EVENT.connectionStarted) {
          sessionId = crypto.randomUUID();
          send(
            encodeDoubaoStartSessionFrame(
              sessionId,
              buildDoubaoDialogSessionPayload(input.model),
            ),
          );
          return;
        }
        if (frame.eventId === VOLC_SERVER_EVENT.sessionStarted && sessionId && !started) {
          started = true;
          void (async () => {
            const sid = sessionId!;
            const pump = pumpSilence(send, sid, 20_000).finally(() => {
              pumpStop = true;
            });
            await new Promise((r) => setTimeout(r, 200));
            if (input.mode === "sayHello") {
              send(encodeDoubaoSayHello(sid, "你好，我在听。"));
            }
            await pump;
          })();
          return;
        }
        if (frame.eventId === VOLC_SERVER_EVENT.ttsResponse && frame.audio?.length) {
          totalTts += frame.audio.length;
        }
        if (frame.eventId === VOLC_SERVER_EVENT.ttsEnded && totalTts > 0) {
          pumpStop = true;
          clearTimeout(timer);
          ws.close();
          resolvePromise(totalTts);
        }
      })();
    });

    ws.on("error", (err) => {
      pumpStop = true;
      clearTimeout(timer);
      reject(err);
    });
  });
}
