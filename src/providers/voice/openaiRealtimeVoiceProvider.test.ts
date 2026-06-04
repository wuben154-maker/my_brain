import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MicCapture } from "./audio/micCapture";
import { OpenAiRealtimeVoiceProvider } from "./openaiRealtimeVoiceProvider";

type MockWsInstance = {
  readyState: number;
  sent: string[];
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onerror: (() => void) | null;
  onclose: (() => void) | null;
  send: (data: string) => void;
  close: () => void;
};

const OPEN = 1;

function parseSentEvents(ws: MockWsInstance): Array<{ type: string }> {
  return ws.sent.map((raw) => JSON.parse(raw) as { type: string });
}

describe("OpenAiRealtimeVoiceProvider", () => {
  let instances: MockWsInstance[];

  beforeEach(() => {
    instances = [];
    vi.spyOn(MicCapture.prototype, "start").mockResolvedValue(undefined);
    vi.spyOn(MicCapture.prototype, "stop").mockImplementation(() => undefined);
    class MockWebSocket {
      static readonly OPEN = OPEN;
      static readonly CLOSED = 3;
      readyState = OPEN;
      sent: string[] = [];
      onopen: (() => void) | null = null;
      onmessage: ((event: { data: string }) => void) | null = null;
      onerror: (() => void) | null = null;
      onclose: (() => void) | null = null;
      constructor() {
        instances.push(this as unknown as MockWsInstance);
      }
      send(data: string): void {
        this.sent.push(data);
      }
      close(): void {
        this.readyState = 3;
      }
    }
    vi.stubGlobal("WebSocket", MockWebSocket);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function connectProvider(provider: OpenAiRealtimeVoiceProvider) {
    const connectPromise = provider.connect({ apiKey: "test-key" });
    const ws = instances[0]!;
    ws.onopen?.();
    ws.onmessage?.({
      data: JSON.stringify({ type: "session.updated" }),
    });
    await connectPromise;
    ws.sent.length = 0;
  }

  it("speak cancels an in-flight response before creating the next one", async () => {
    const provider = new OpenAiRealtimeVoiceProvider();
    await connectProvider(provider);

    await provider.speak("第一段播报");
    const ws = instances[0]!;
    expect(provider.getState()).toBe("speaking");
    ws.onmessage?.({ data: JSON.stringify({ type: "response.created" }) });
    expect(provider.getState()).toBe("speaking");

    await provider.speak("第二段播报");
    const events = parseSentEvents(ws);
    const cancelIndex = events.findIndex((e) => e.type === "response.cancel");
    const createIndexes = events
      .map((e, index) => (e.type === "response.create" ? index : -1))
      .filter((index) => index >= 0);
    expect(cancelIndex).toBeGreaterThanOrEqual(0);
    expect(createIndexes.length).toBeGreaterThanOrEqual(2);
    expect(cancelIndex).toBeLessThan(createIndexes[createIndexes.length - 1]!);
  });

  it("speak enters speaking before response.created (interrupt pending window)", async () => {
    const provider = new OpenAiRealtimeVoiceProvider();
    const states: string[] = [];
    provider.onStateChange((state) => states.push(state));
    await connectProvider(provider);

    void provider.speak("待响应播报");
    expect(provider.getState()).toBe("speaking");
    expect(states).toContain("speaking");
  });
});
