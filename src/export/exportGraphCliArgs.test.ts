import { describe, expect, it } from "vitest";
import {
  normalizeExportFormat,
  parseExportGraphArgs,
} from "@/export/exportGraphCliArgs";

describe("parseExportGraphArgs", () => {
  it("parses space-separated --format and --out", () => {
    expect(
      parseExportGraphArgs([
        "--format",
        "json",
        "--out",
        "tmp/spec-verifier-showcase.json",
      ]),
    ).toEqual({
      format: "json",
      out: "tmp/spec-verifier-showcase.json",
    });
  });

  it("parses equals forms --format=markdown --out=path", () => {
    expect(
      parseExportGraphArgs([
        "--format=markdown",
        "--out=tmp/spec-verifier-showcase.md",
      ]),
    ).toEqual({
      format: "markdown",
      out: "tmp/spec-verifier-showcase.md",
    });
  });

  it("accepts md as markdown alias", () => {
    expect(parseExportGraphArgs(["--format", "md"])).toEqual({
      format: "markdown",
      out: "tmp/showcase-graph.md",
    });
  });

  it("defaults json out path when --out omitted", () => {
    expect(parseExportGraphArgs(["--format", "json"])).toEqual({
      format: "json",
      out: "tmp/showcase-graph.json",
    });
  });
});

describe("normalizeExportFormat", () => {
  it("maps json, md, and markdown", () => {
    expect(normalizeExportFormat("json")).toBe("json");
    expect(normalizeExportFormat("md")).toBe("markdown");
    expect(normalizeExportFormat("markdown")).toBe("markdown");
    expect(normalizeExportFormat("invalid")).toBeUndefined();
  });
});
