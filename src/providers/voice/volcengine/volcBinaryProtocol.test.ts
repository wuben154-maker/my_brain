import { describe, expect, it } from "vitest";
import {
  buildStartSessionPayload,
  decodeVolcFrame,
  encodeJsonClientEvent,
  encodeStartConnection,
  MESSAGE_FLAGS,
  MESSAGE_TYPE,
} from "./volcBinaryProtocol";
import { VOLC_CLIENT_EVENT } from "./volcRealtimeConstants";

describe("volcBinaryProtocol", () => {
  it("encodes StartConnection with event id 1", () => {
    const frame = encodeStartConnection();
    expect(frame[0]).toBe(0x11);
    expect((frame[1] & 0xf0) >> 4).toBe(MESSAGE_TYPE.fullClientRequest);
    expect(frame[1] & 0x0f).toBe(MESSAGE_FLAGS.hasEvent);
    const decoded = decodeVolcFrame(frame);
    expect(decoded.eventId).toBe(VOLC_CLIENT_EVENT.startConnection);
    expect(new TextDecoder().decode(decoded.payload)).toBe("{}");
  });

  it("builds StartSession payload with model version", () => {
    const payload = buildStartSessionPayload({ model: "2.2.0.0" });
    const dialog = payload.dialog as { extra?: { model?: string } };
    expect(dialog.extra?.model).toBe("2.2.0.0");
  });

  it("encodes StartSession with session id", () => {
    const frame = encodeJsonClientEvent({
      eventId: VOLC_CLIENT_EVENT.startSession,
      sessionId: "abc",
      payload: buildStartSessionPayload({ model: "1.2.1.1" }),
    });
    const decoded = decodeVolcFrame(frame);
    expect(decoded.eventId).toBe(100);
    expect(decoded.sessionId).toBe("abc");
  });
});
