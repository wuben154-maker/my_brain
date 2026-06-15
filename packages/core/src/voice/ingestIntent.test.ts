import { describe, expect, it } from "vitest";

import {
  ingestCommandToUserIntent,
  parseIngestCommand,
  resolveVoiceTranscript,
} from "./ingestIntent.js";

describe("parseIngestCommand", () => {
  it.each(["入", "收录", "记下来", "要记"])("recognizes ingest on attempt 1: %s", (phrase) => {
    expect(parseIngestCommand(phrase, 1)).toEqual({
      kind: "command",
      command: "ingest",
    });
  });

  it.each(["不要", "跳过", "算了"])("recognizes skip on attempt 1: %s", (phrase) => {
    expect(parseIngestCommand(phrase, 1)).toEqual({
      kind: "command",
      command: "skip",
    });
  });

  it.each(["讲细点", "展开讲讲", "详细说说"])("recognizes elaborate on attempt 1: %s", (phrase) => {
    expect(parseIngestCommand(phrase, 1)).toEqual({
      kind: "command",
      command: "elaborate",
    });
  });

  it("reprompts on ambiguous first attempt", () => {
    expect(parseIngestCommand("嗯", 1)).toEqual({ kind: "reprompt" });
    expect(parseIngestCommand("随便", 1)).toEqual({ kind: "reprompt" });
    expect(parseIngestCommand("入不要", 1)).toEqual({ kind: "reprompt" });
  });

  it("defaults to skip on ambiguous second attempt", () => {
    expect(parseIngestCommand("嗯", 2)).toEqual({
      kind: "command",
      command: "skip",
    });
    expect(parseIngestCommand("入不要", 2)).toEqual({
      kind: "command",
      command: "skip",
    });
  });

  it("handles empty transcript", () => {
    expect(parseIngestCommand("", 1)).toEqual({ kind: "reprompt" });
    expect(parseIngestCommand("   ", 2)).toEqual({
      kind: "command",
      command: "skip",
    });
  });
});

describe("resolveVoiceTranscript", () => {
  it("maps voice commands to the same UserIntent as text IntentRail", () => {
    expect(resolveVoiceTranscript("入", 1)).toEqual({ kind: "intent", intent: "ingest" });
    expect(resolveVoiceTranscript("不要", 1)).toEqual({ kind: "intent", intent: "skip" });
    expect(resolveVoiceTranscript("讲细点", 1)).toEqual({
      kind: "intent",
      intent: "explain_more",
    });
  });

  it("aligns ingestCommandToUserIntent with conductor UserIntent", () => {
    expect(ingestCommandToUserIntent("ingest")).toBe("ingest");
    expect(ingestCommandToUserIntent("skip")).toBe("skip");
    expect(ingestCommandToUserIntent("elaborate")).toBe("explain_more");
  });
});
