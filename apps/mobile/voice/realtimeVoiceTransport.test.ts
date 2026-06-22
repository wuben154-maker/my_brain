import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildOpenAiRealtimeConnectionRequest,
  buildRealtimeConnectionRequest,
  createByokRealtimeVoiceTransport,
  createMockRealtimeVoiceTransport,
  testRealtimeVoiceTransport,
  type WebSocketConstructor,
  type WebSocketLike,
} from "./realtimeVoiceTransport";

type MockWsInstance = WebSocketLike & {
  url: string;
  protocols: string | string[] | undefined;
  sent: string[];
};

const OPEN = 1;

function createMockWebSocketFactory(): {
  instances: MockWsInstance[];
  WebSocket: WebSocketConstructor;
} {
  const instances: MockWsInstance[] = [];
  class MockWebSocket implements WebSocketLike {
    static readonly OPEN = OPEN;
    readyState = OPEN;
    sent: string[] = [];
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onerror: (() => void) | null = null;
    onclose: ((event?: { code?: number }) => void) | null = null;

    constructor(
      public url: string,
      public protocols?: string | string[],
    ) {
      instances.push(this as MockWsInstance);
    }

    send(data: string): void {
      this.sent.push(data);
    }

    close(): void {
      this.readyState = 3;
      this.onclose?.();
    }
  }
  return { instances, WebSocket: MockWebSocket as unknown as WebSocketConstructor };
}

describe("realtimeVoiceTransport BYOK", () => {
  let factory: ReturnType<typeof createMockWebSocketFactory>;

  beforeEach(() => {
    factory = createMockWebSocketFactory();
    vi.stubGlobal("WebSocket", factory.WebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds OpenAI Realtime connection request with api key in protocols", () => {
    const request = buildOpenAiRealtimeConnectionRequest("sk-voice-test", "gpt-4o-realtime");
    expect(request.url).toContain("wss://api.openai.com/v1/realtime");
    expect(request.url).toContain("model=gpt-4o-realtime");
    expect(request.protocols).toContain("realtime");
    expect(request.protocols).toContain("openai-insecure-api-key.sk-voice-test");
    expect(request.protocols).toContain("openai-beta.realtime-v1");
  });

  it("connects via mock WebSocket and sends session.update on open", async () => {
    const transport = createByokRealtimeVoiceTransport({ WebSocket: factory.WebSocket });
    const request = buildRealtimeConnectionRequest(
      { providerId: "openai-realtime", voiceModel: "gpt-4o-realtime", region: "us-east" },
      "sk-live",
    );

    const connectPromise = transport.connect(request);
    const ws = factory.instances[0]!;
    expect(ws.url).toBe(request.url);
    expect(ws.protocols).toEqual(request.protocols);

    ws.onopen?.();
    expect(ws.sent.some((raw) => JSON.parse(raw).type === "session.update")).toBe(true);

    ws.onmessage?.({ data: JSON.stringify({ type: "session.updated" }) });
    await connectPromise;
    expect(transport.isConnected()).toBe(true);
    transport.disconnect();
    expect(transport.isConnected()).toBe(false);
  });

  it("emits user transcript on OpenAI STT completion frame", async () => {
    const transport = createByokRealtimeVoiceTransport({ WebSocket: factory.WebSocket });
    const request = buildRealtimeConnectionRequest(
      { providerId: "openai-realtime", voiceModel: "gpt-4o-realtime", region: "us-east" },
      "sk-live",
    );
    const transcripts: string[] = [];
    transport.onTranscript((text) => transcripts.push(text));

    const connectPromise = transport.connect(request);
    const ws = factory.instances[0]!;
    ws.onopen?.();
    ws.onmessage?.({ data: JSON.stringify({ type: "session.updated" }) });
    await connectPromise;

    ws.onmessage?.({
      data: JSON.stringify({
        type: "conversation.item.input_audio_transcription.completed",
        transcript: "  入  ",
      }),
    });

    expect(transcripts).toEqual(["入"]);
  });

  it("mock transport exposes onTranscript subscription without native STT", () => {
    const transport = createMockRealtimeVoiceTransport();
    const received: string[] = [];
    const unsub = transport.onTranscript((text) => received.push(text));
    unsub();
    expect(received).toEqual([]);
  });

  it("maps unauthorized handshake to error test result — not live", async () => {
    const factory = createMockWebSocketFactory();
    const resultPromise = testRealtimeVoiceTransport(
      { providerId: "openai-realtime", voiceModel: "gpt-4o-realtime", region: "us-east" },
      true,
      "sk-bad",
      false,
      { WebSocket: factory.WebSocket },
    );
    await Promise.resolve();
    const socket = factory.instances[0]!;
    socket.onopen?.();
    socket.onmessage?.({
      data: JSON.stringify({
        type: "error",
        error: { code: "invalid_api_key", message: "unauthorized" },
      }),
    });
    const result = await resultPromise;
    expect(result.status).toBe("error");
    expect(result.status).not.toBe("live");
    expect(result.code).toBe("UNAUTHORIZED");
  });

  it("no-key path returns mock without opening WebSocket", async () => {
    const result = await testRealtimeVoiceTransport(
      { providerId: "openai-realtime", voiceModel: "gpt-4o-realtime", region: "us-east" },
      false,
      null,
      false,
      { WebSocket: factory.WebSocket },
    );
    expect(result.status).toBe("mock");
    expect(factory.instances).toHaveLength(0);
  });

  it("mock transport stays visibly mock", async () => {
    const transport = createMockRealtimeVoiceTransport();
    expect(transport.kind).toBe("mock");
    await transport.connect({
      url: "wss://mock",
      protocols: [],
      providerId: "mock",
      model: "mock-voice",
    });
    expect(transport.isConnected()).toBe(true);
  });
});
