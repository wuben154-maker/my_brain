import { describe, expect, it } from "vitest";
import { createCognitiveAction } from "@/actions/createCognitiveAction";
import {
  bodyMarkdownPrefixHash,
  CognitiveActionValidationError,
  isProjectSuggestionMetadata,
  parseCognitiveAction,
  parseCognitiveActionCitations,
  serializeCognitiveAction,
  serializeCognitiveActionCitations,
  validateCognitiveActionCitations,
} from "@/domain/actions/cognitiveAction";
import {
  BRAIN_WRITE_TOOL_BLOCKLIST,
  listReadonlyTools,
} from "@/mcp/brainReadonlyHandlers";
import { readRepoSource } from "@/invariants/readRepoSource";
import {
  createTempStorage,
  reopenStorage,
  STORAGE_BACKEND_KINDS,
} from "@/invariants/testStorage";
import { useCognitiveActionStore } from "@/stores/cognitiveActionStore";
import type { BrainGraphSnapshot } from "@/domain/graph";

describe("cognitiveAction domain", () => {
  it("create defaults to draft and suggest", () => {
    const action = createCognitiveAction({
      id: "action-1",
      kind: "weekly_review",
      title: "回顾",
      bodyMarkdown: "# 回顾",
      citations: [{ type: "node", id: "n-1", label: "RAG" }],
    });
    expect(action.status).toBe("draft");
    expect(action.permissionLevel).toBe("suggest");
  });

  it("rejects invalid citations fast", () => {
    expect(() =>
      createCognitiveAction({
        id: "bad",
        kind: "weekly_review",
        title: "t",
        bodyMarkdown: "b",
        citations: [{ type: "node", id: "", label: "x" } as never],
      }),
    ).toThrow(CognitiveActionValidationError);
  });

  it("preserves optional metadata on project_issue actions", () => {
    const action = createCognitiveAction({
      id: "pa-meta",
      kind: "project_issue",
      title: "Issue",
      bodyMarkdown: "# body",
      citations: [{ type: "node", id: "demo-agent", label: "AI Agent" }],
      metadata: {
        linkedNodeIds: ["demo-agent"],
        reason: "linked to agent",
        expectedImpact: "better demo",
        suggestedNextStep: "open issue draft",
        worldItemId: "radar-wi-rel-1",
      },
    });
    expect(isProjectSuggestionMetadata(action.metadata!)).toBe(true);
    if (isProjectSuggestionMetadata(action.metadata!)) {
      expect(action.metadata.linkedNodeIds).toEqual(["demo-agent"]);
    }
    const parsed = parseCognitiveAction(serializeCognitiveAction(action));
    expect(isProjectSuggestionMetadata(parsed.metadata!)).toBe(true);
    if (isProjectSuggestionMetadata(parsed.metadata!)) {
      expect(parsed.metadata.linkedNodeIds).toEqual(["demo-agent"]);
      expect(parsed.metadata.worldItemId).toBe("radar-wi-rel-1");
    }
  });

  it("weekly_review without metadata stays compatible", () => {
    const action = createCognitiveAction({
      id: "weekly-no-meta",
      kind: "weekly_review",
      title: "回顾",
      bodyMarkdown: "# 回顾",
      citations: [{ type: "node", id: "n-1", label: "RAG" }],
    });
    expect(action.metadata).toBeUndefined();
  });

  it("serializes citations and full action round-trip", () => {
    const citations = [
      { type: "historyEntry" as const, id: "h-1", label: "merge" },
      { type: "node" as const, id: "n-1", label: "Graphiti" },
    ];
    const json = serializeCognitiveActionCitations(citations);
    expect(validateCognitiveActionCitations(parseCognitiveActionCitations(json))).toEqual(
      citations,
    );

    const action = createCognitiveAction({
      id: "round-trip",
      kind: "project_issue",
      title: "Issue draft",
      bodyMarkdown: "body",
      citations,
    });
    const parsed = parseCognitiveAction(serializeCognitiveAction(action));
    expect(parsed).toEqual(action);
  });

  it("bodyMarkdownPrefixHash is stable for prefix", () => {
    const markdown = "# 每周脑图回顾 · 2026-W22\n\n## 本周图谱结构变更";
    expect(bodyMarkdownPrefixHash(markdown)).toBe(bodyMarkdownPrefixHash(markdown));
    expect(bodyMarkdownPrefixHash(markdown)).not.toBe(
      bodyMarkdownPrefixHash(markdown + " extra"),
    );
  });
});

describe("cognitiveActionStore", () => {
  it("stores one draft and round-trips through sqlite backends", async () => {
    for (const kind of STORAGE_BACKEND_KINDS) {
      const fixture = createTempStorage(kind);
      try {
        await fixture.storage.init();
        useCognitiveActionStore.getState().clear();

        const action = await useCognitiveActionStore
          .getState()
          .createAndStore(fixture.storage, {
            id: `store-draft-${kind}`,
            kind: "weekly_review",
            title: "每周脑图回顾 · 2026-W22",
            bodyMarkdown: "# draft",
            citations: [{ type: "node", id: "n-1", label: "A" }],
          });

        expect(action.status).toBe("draft");
        expect(useCognitiveActionStore.getState().listDrafts()).toHaveLength(1);

        fixture.storage.close();
        const reopened = reopenStorage(fixture.dbPath, kind);
        await reopened.init();
        useCognitiveActionStore.getState().clear();
        await useCognitiveActionStore.getState().load(reopened);
        const loaded = useCognitiveActionStore
          .getState()
          .actions.find((row) => row.id === action.id);
        expect(loaded?.title).toBe(action.title);
        expect(loaded?.status).toBe("draft");
        expect(loaded?.metadata).toBeUndefined();

        const withMeta = await useCognitiveActionStore
          .getState()
          .createAndStore(reopened, {
            id: `store-meta-${kind}`,
            kind: "project_issue",
            title: "Issue draft",
            bodyMarkdown: "# body",
            citations: [{ type: "node", id: "demo-agent", label: "AI Agent" }],
            metadata: {
              linkedNodeIds: ["demo-agent"],
              reason: "test reason",
              expectedImpact: "test impact",
              suggestedNextStep: "test next",
            },
          });
        await reopened.close();
        const reopenedMeta = reopenStorage(fixture.dbPath, kind);
        await reopenedMeta.init();
        useCognitiveActionStore.getState().clear();
        await useCognitiveActionStore.getState().load(reopenedMeta);
        const loadedMeta = useCognitiveActionStore
          .getState()
          .actions.find((row) => row.id === withMeta.id);
        expect(loadedMeta?.metadata && isProjectSuggestionMetadata(loadedMeta.metadata)).toBe(true);
        if (loadedMeta?.metadata && isProjectSuggestionMetadata(loadedMeta.metadata)) {
          expect(loadedMeta.metadata.linkedNodeIds).toEqual(["demo-agent"]);
        }
        await reopenedMeta.close();
      } finally {
        fixture.cleanup();
        useCognitiveActionStore.getState().clear();
      }
    }
  });

  it("dismiss does not mutate graph", async () => {
    const graph: BrainGraphSnapshot = {
      nodes: [
        {
          id: "n-1",
          title: "RAG",
          intro: "",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      edges: [],
    };
    const before = structuredClone(graph);

    useCognitiveActionStore.getState().clear();
    await useCognitiveActionStore.getState().createAndStore(null, {
      id: "dismiss-me",
      kind: "weekly_review",
      title: "t",
      bodyMarkdown: "b",
      citations: [{ type: "node", id: "n-1", label: "RAG" }],
    });
    await useCognitiveActionStore.getState().dismissAction(null, "dismiss-me");

    const afterDismiss = useCognitiveActionStore
      .getState()
      .actions.find((row) => row.id === "dismiss-me");
    expect(afterDismiss?.status).toBe("dismissed");
    expect(graph).toEqual(before);
    useCognitiveActionStore.getState().clear();
  });

  it("confirm without userEvent is blocked", async () => {
    useCognitiveActionStore.getState().clear();
    await useCognitiveActionStore.getState().createAndStore(null, {
      id: "confirm-blocked",
      kind: "weekly_review",
      title: "t",
      bodyMarkdown: "b",
      citations: [{ type: "node", id: "n-1", label: "A" }],
    });

    await expect(
      useCognitiveActionStore.getState().confirmAction(null, "confirm-blocked", undefined),
    ).rejects.toThrow(/user_confirm/);

    const row = useCognitiveActionStore
      .getState()
      .actions.find((action) => action.id === "confirm-blocked");
    expect(row?.status).toBe("draft");
    useCognitiveActionStore.getState().clear();
  });

  it("MemoryProvider sources do not write cognitive_actions", () => {
    const memorySources = [
      "src/providers/memory/mockMemoryProvider.ts",
      "src/providers/memory/everMemOsProvider.ts",
      "src/providers/memory/types.ts",
    ];
    for (const relativePath of memorySources) {
      const source = readRepoSource(relativePath);
      expect(source.toLowerCase()).not.toContain("cognitive_actions");
      expect(source).not.toContain("saveCognitiveAction");
      expect(source).not.toContain("listCognitiveActions");
    }
  });

  it("MCP readonly surface excludes cognitive action write tools", () => {
    const tools = listReadonlyTools();
    for (const blocked of BRAIN_WRITE_TOOL_BLOCKLIST) {
      expect(tools).not.toContain(blocked);
    }
    expect(tools).not.toContain("create_cognitive_action");
    expect(tools).not.toContain("confirm_cognitive_action");
  });
});
