import { describe, expect, it } from "vitest";
import { parseIngestCommand } from "@/lib/parseIngestCommand";

describe("parseIngestCommand", () => {
  it("classifies ingest variants", () => {
    for (const phrase of ["入", "收录", "记下来", "要记进大脑"]) {
      expect(parseIngestCommand(phrase, 1)).toEqual({
        kind: "command",
        command: "ingest",
      });
    }
  });

  it("classifies skip variants", () => {
    for (const phrase of ["不要", "跳过", "算了", "不要入", "不入"]) {
      expect(parseIngestCommand(phrase, 1)).toEqual({
        kind: "command",
        command: "skip",
      });
    }
  });

  it("classifies elaborate variants", () => {
    for (const phrase of ["讲细点", "展开讲讲", "多说一点", "详细说说"]) {
      expect(parseIngestCommand(phrase, 1)).toEqual({
        kind: "command",
        command: "elaborate",
      });
    }
  });

  it("reprompts on ambiguous first attempt", () => {
    expect(parseIngestCommand("嗯", 1)).toEqual({ kind: "reprompt" });
    expect(parseIngestCommand("随便", 1)).toEqual({ kind: "reprompt" });
    expect(parseIngestCommand("入不要", 1)).toEqual({ kind: "reprompt" });
  });

  it("defaults ambiguous second attempt to skip", () => {
    expect(parseIngestCommand("嗯", 2)).toEqual({
      kind: "command",
      command: "skip",
    });
    expect(parseIngestCommand("入不要", 2)).toEqual({
      kind: "command",
      command: "skip",
    });
  });

  it("empty transcript reprompts once then skips", () => {
    expect(parseIngestCommand("", 1)).toEqual({ kind: "reprompt" });
    expect(parseIngestCommand("   ", 2)).toEqual({
      kind: "command",
      command: "skip",
    });
  });
});
