import { describe, expect, it } from "vitest";
import {
  DOMAIN_TO_VISUAL_RELATION,
  RELATION_VISUAL_TOKENS,
  relationLinkWidth,
  relationVisualForDomain,
  visualRelationForDomain,
} from "@/lib/graphVisualTokens";

describe("graphVisualTokens relation visuals", () => {
  it("maps four domain relation types to visual kinds", () => {
    expect(DOMAIN_TO_VISUAL_RELATION.is_a).toBe("containment");
    expect(DOMAIN_TO_VISUAL_RELATION.depends_on).toBe("influence");
    expect(DOMAIN_TO_VISUAL_RELATION.replaces).toBe("causal");
    expect(DOMAIN_TO_VISUAL_RELATION.related).toBe("correlation");
  });

  it("exposes six visual relation tokens with spec colors", () => {
    expect(RELATION_VISUAL_TOKENS.causal).toMatchObject({
      label: "因果关系",
      color: "#4A6BFF",
      lineStyle: "solid",
    });
    expect(RELATION_VISUAL_TOKENS.correlation.lineStyle).toBe("dashed");
    expect(RELATION_VISUAL_TOKENS.influence.lineStyle).toBe("thin-solid");
    expect(RELATION_VISUAL_TOKENS.emotional.lineStyle).toBe("dashed");
  });

  it("resolves domain edges through the visual mapping", () => {
    expect(visualRelationForDomain("is_a")).toBe("containment");
    expect(relationVisualForDomain("depends_on").label).toBe("影响关系");
    expect(relationLinkWidth(RELATION_VISUAL_TOKENS.influence, false)).toBe(
      0.75,
    );
    expect(relationLinkWidth(RELATION_VISUAL_TOKENS.causal, true)).toBe(2);
  });

  it("falls back to correlation for unknown relation strings", () => {
    expect(visualRelationForDomain("unknown")).toBe("correlation");
  });
});
