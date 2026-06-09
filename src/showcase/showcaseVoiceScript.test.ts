import { describe, expect, it } from "vitest";
import { parseIngestCommand } from "@/lib/parseIngestCommand";
import {
  SHOWCASE_VOICE_AMBIGUITY_SCRIPT,
  SHOWCASE_VOICE_SCRIPT,
} from "@/showcase/showcaseFixtures";

describe("showcaseVoiceScript", () => {
  it("aligns ingest_parse steps 1–3 with parseIngestCommand", () => {
    const ingestSteps = SHOWCASE_VOICE_SCRIPT.filter(
      (step) => step.kind === "ingest_parse",
    );

    for (const step of ingestSteps) {
      const attempt = step.attempt ?? 1;
      const result = parseIngestCommand(step.transcript, attempt);
      expect(result.kind).toBe("command");
      if (result.kind === "command") {
        expect(result.command).toBe(step.expectedCommand);
      }
    }
  });

  it("covers ambiguity regressions from the spec", () => {
    for (const step of SHOWCASE_VOICE_AMBIGUITY_SCRIPT) {
      const attempt = step.attempt ?? 1;
      const result = parseIngestCommand(step.transcript, attempt);
      if (step.expectedParse === "reprompt") {
        expect(result).toEqual({ kind: "reprompt" });
      } else if (step.expectedCommand) {
        expect(result).toEqual({
          kind: "command",
          command: step.expectedCommand,
        });
      }
    }
  });

  it("defines skip_launch and undo harness steps without ingest parsing", () => {
    const skip = SHOWCASE_VOICE_SCRIPT.find((s) => s.step === 0);
    const undo = SHOWCASE_VOICE_SCRIPT.find((s) => s.step === 4);
    expect(skip?.kind).toBe("skip_launch");
    expect(skip?.transcript).toBe("跳过");
    expect(undo?.kind).toBe("undo_harness");
    expect(undo?.transcript).toBe("撤销");
  });
});
