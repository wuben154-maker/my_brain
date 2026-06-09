import { describe, expect, it } from "vitest";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { generateInterviewPack } from "@/cognitive/generateInterviewPack";
import { SHOWCASE_GRAPH_SNAPSHOT } from "@/showcase/showcaseFixtures";

describe("interviewProfileDepth (KOS-C3 + C2)", () => {
  it("can_explain on demo-rag sets iq-5 advanced with architecture follow-up", () => {
    const profile = {
      ...DEFAULT_USER_PROFILE,
      understanding: { "demo-rag": "can_explain" as const },
    };
    const pack = generateInterviewPack(SHOWCASE_GRAPH_SNAPSHOT, profile);
    const iq5 = pack.questions.find((q) => q.id === "iq-5");
    expect(iq5?.depth).toBe("advanced");
    expect(
      iq5?.followUps.some((f) => f.prompt.includes("架构层面")),
    ).toBe(true);
    expect(iq5?.scaffold).toBeUndefined();
  });

  it("unfamiliar on demo-rag adds scaffold on iq-5", () => {
    const profile = {
      ...DEFAULT_USER_PROFILE,
      understanding: { "demo-rag": "unfamiliar" as const },
    };
    const pack = generateInterviewPack(SHOWCASE_GRAPH_SNAPSHOT, profile);
    const iq5 = pack.questions.find((q) => q.id === "iq-5");
    expect(iq5?.depth).toBe("foundational");
    expect(iq5?.scaffold).toBeDefined();
    expect(iq5?.scaffold).toContain("RAG");
  });

  it("profile level change alters at least one question depth/scaffold", () => {
    const heardPack = generateInterviewPack(
      SHOWCASE_GRAPH_SNAPSHOT,
      DEFAULT_USER_PROFILE,
    );
    const unfamiliarPack = generateInterviewPack(SHOWCASE_GRAPH_SNAPSHOT, {
      ...DEFAULT_USER_PROFILE,
      understanding: {
        "demo-rag": "unfamiliar",
        "demo-agent": "unfamiliar",
        "demo-mcp": "unfamiliar",
      },
    });
    const heardIq5 = heardPack.questions.find((q) => q.id === "iq-5");
    const unfamiliarIq5 = unfamiliarPack.questions.find((q) => q.id === "iq-5");
    expect(heardIq5?.depth).not.toBe(unfamiliarIq5?.depth);
    expect(unfamiliarIq5?.scaffold).toBeTruthy();
    expect(heardIq5?.scaffold).toBeFalsy();
  });
});
