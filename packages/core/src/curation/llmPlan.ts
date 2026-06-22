import type { GraphSnapshot } from "../graph/types.js";
import type { LlmProvider } from "../providers/types.js";
import { validateLlmCurationSuggestion } from "./schema.js";
import { planFromLlmActions } from "./planner.js";
import type { CurationPlan } from "./types.js";

export type LlmCurationPlanResult =
  | { ok: true; plan: CurationPlan }
  | { ok: false; degradedReason: string };

function buildCurationPrompt(snapshot: GraphSnapshot, ingestedNodeId: string): string {
  const ingested = snapshot.nodes.find((node) => node.id === ingestedNodeId);
  const peers = snapshot.nodes
    .filter((node) => !node.archived && node.id !== ingestedNodeId)
    .map(
      (node) =>
        `- id=${node.id} concept=${node.concept} intro=${node.intro.slice(0, 80)}`,
    )
    .join("\n");

  return [
    "Suggest post-ingest graph curation actions only.",
    "Allowed kinds: merge, link, archive. Never create nodes.",
    `Ingested node: id=${ingestedNodeId} concept=${ingested?.concept ?? "unknown"}`,
    "Peers:",
    peers || "(none)",
    "Return JSON: { actions: [{ kind, summary, ...payload fields }] }",
  ].join("\n");
}

export async function planLlmCuration(
  llm: LlmProvider,
  snapshot: GraphSnapshot,
  ingestedNodeId: string,
): Promise<LlmCurationPlanResult> {
  const result = await llm.generateStructuredJson({
    prompt: buildCurationPrompt(snapshot, ingestedNodeId),
    schemaHint: "{ actions: [{ kind: merge|link|archive, summary, ... }] }",
    validate: validateLlmCurationSuggestion,
  });

  if (!result.ok) {
    return {
      ok: false,
      degradedReason: result.message,
    };
  }

  return {
    ok: true,
    plan: planFromLlmActions(result.value.actions),
  };
}
