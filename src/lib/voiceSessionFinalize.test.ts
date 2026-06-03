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
        return true;
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

  it("skips clear when profile distillation reports failure", async () => {
    const order: string[] = [];
    await finalizeVoiceSession({
      transcripts: [{ role: "user", text: "hello", final: true }],
      disconnectVoice: async () => {
        order.push("disconnect");
      },
      distillProfile: async () => {
        order.push("distill");
        return false;
      },
      rememberSession: async () => {
        order.push("remember");
      },
      clearTranscripts: () => {
        order.push("clear");
      },
    });
    expect(order).toEqual(["disconnect", "distill", "remember"]);
  });

  it("skips clear when profile distillation throws", async () => {
    const order: string[] = [];
    await expect(
      finalizeVoiceSession({
        transcripts: [{ role: "user", text: "hello", final: true }],
        disconnectVoice: async () => {
          order.push("disconnect");
        },
        distillProfile: async () => {
          order.push("distill");
          throw new Error("distill failed");
        },
        rememberSession: async () => {
          order.push("remember");
        },
        clearTranscripts: () => {
          order.push("clear");
        },
      }),
    ).rejects.toThrow("distill failed");
    expect(order).toEqual(["disconnect", "distill"]);
  });
});
