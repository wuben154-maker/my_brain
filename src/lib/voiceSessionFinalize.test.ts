import { describe, expect, it } from "vitest";
import { finalizeVoiceSession } from "@/lib/voiceSessionFinalize";

describe("finalizeVoiceSession", () => {
  it("runs disconnect → distill → remember → clear in order", async () => {
    const order: string[] = [];
    await finalizeVoiceSession({
      transcripts: [{ role: "user", text: "hello", final: true }],
      disconnectVoice: async () => {
        order.push("disconnect");
      },
      distillProfile: async () => {
        order.push("distill");
      },
      rememberSession: async () => {
        order.push("remember");
      },
      clearTranscripts: () => {
        order.push("clear");
      },
    });
    expect(order).toEqual(["disconnect", "distill", "remember", "clear"]);
  });
});
