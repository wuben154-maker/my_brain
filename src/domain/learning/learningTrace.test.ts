import { describe, expect, it } from "vitest";
import {
  assertLearningTraceMetadataSafe,
  FORBIDDEN_TRACE_METADATA_KEYS,
  formatPendingConceptRef,
  isPendingConceptRef,
  LEARNING_TRACE_FIXTURES,
  parseLearningTraceMetadata,
  parsePendingConceptTitle,
  serializeLearningTraceMetadata,
} from "@/domain/learning/learningTrace";
import {
  BRAIN_WRITE_TOOL_BLOCKLIST,
  listReadonlyTools,
} from "@/mcp/brainReadonlyHandlers";
import { readRepoSource } from "@/invariants/readRepoSource";

describe("learningTrace domain", () => {
  it("serializes and parses metadata round-trip", () => {
    const metadata = {
      worldItemId: "showcase-brief-1",
      depth: 2,
      nodeId: "node-a",
    };
    const json = serializeLearningTraceMetadata(metadata);
    expect(parseLearningTraceMetadata(json)).toEqual(metadata);
  });

  it("formats pending concept refs", () => {
    const ref = formatPendingConceptRef("OpenAI Realtime API 更新");
    expect(ref).toBe("pending:OpenAI Realtime API 更新");
    expect(isPendingConceptRef(ref)).toBe(true);
    expect(parsePendingConceptTitle(ref)).toBe("OpenAI Realtime API 更新");
  });

  it("rejects forbidden metadata keys", () => {
    for (const key of FORBIDDEN_TRACE_METADATA_KEYS) {
      expect(() =>
        assertLearningTraceMetadataSafe({
          [key]: "leak",
        } as never),
      ).toThrow(key);
    }
  });

  it("golden fixtures cover showcase briefing kinds", () => {
    expect(LEARNING_TRACE_FIXTURES.map((row) => row.kind)).toEqual([
      "briefing_skip",
      "briefing_elaborate",
      "briefing_ingest",
    ]);
    const ingest = LEARNING_TRACE_FIXTURES.find(
      (row) => row.kind === "briefing_ingest",
    );
    expect(ingest?.conceptRef).toBe("showcase-ingest-graphiti");
    expect(ingest?.metadata.nodeId).toBe("showcase-ingest-graphiti");
  });

  it("MemoryProvider sources do not write learning_traces", () => {
    const memorySources = [
      "src/providers/memory/mockMemoryProvider.ts",
      "src/providers/memory/everMemOsProvider.ts",
      "src/providers/memory/types.ts",
    ];
    for (const relativePath of memorySources) {
      const source = readRepoSource(relativePath);
      expect(source.toLowerCase()).not.toContain("learning_traces");
      expect(source).not.toContain("recordLearningTrace");
      expect(source).not.toContain("saveLearningTrace");
    }
  });

  it("MCP readonly surface excludes learning trace write tools", () => {
    const tools = listReadonlyTools();
    for (const blocked of [
      ...BRAIN_WRITE_TOOL_BLOCKLIST,
      "record_learning_trace",
      "save_learning_trace",
      "learning_trace_write",
    ]) {
      expect(tools).not.toContain(blocked);
    }
  });
});
