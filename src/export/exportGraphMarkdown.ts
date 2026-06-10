import type { BrainGraphSnapshot } from "@/domain/graph";
import { isConceptNode } from "@/domain/graph";
import { migrateLegacySourceUrlToSourceRefs } from "@/domain/graph/sourceRef";
import type { GraphExportOptions } from "@/export/graphExportSchema";
import { sortGraphExportNodes, toGraphExportNode } from "@/export/graphExportSchema";

export const GRAPH_MARKDOWN_HEADER = "# my_brain Graph Export";

export interface ExportGraphMarkdownOptions extends GraphExportOptions {
  /** Include exportedAt line under the header. */
  includeExportedAt?: boolean;
}

function formatSourceRefLine(
  ref: ReturnType<typeof migrateLegacySourceUrlToSourceRefs>[number],
): string {
  const urlPart = ref.url ? ` — ${ref.url}` : "";
  return `- ${ref.title} (${ref.kind})${urlPart}`;
}

function formatNodeSection(
  node: ReturnType<typeof toGraphExportNode>,
  sourceRefs: ReturnType<typeof migrateLegacySourceUrlToSourceRefs>,
): string {
  const lines = [`## ${node.title}`, "", node.intro, ""];
  if (node.archived) {
    lines.push("_Archived_", "");
  }
  if (sourceRefs.length > 0) {
    lines.push("**Sources:**", ...sourceRefs.map(formatSourceRefLine), "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

/**
 * Deterministic markdown export: nodes sorted by title (zh-CN locale).
 * Does not mutate the input graph.
 */
export function exportGraphMarkdown(
  graph: BrainGraphSnapshot,
  options: ExportGraphMarkdownOptions = {},
): string {
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  const includeExportedAt = options.includeExportedAt ?? true;

  const exportNodes = sortGraphExportNodes(
    graph.nodes.map((node) => toGraphExportNode(node)),
  );

  const headerLines = [GRAPH_MARKDOWN_HEADER];
  if (includeExportedAt) {
    headerLines.push("", `Exported: ${exportedAt}`);
  }

  const sections = exportNodes.map((exportNode) => {
    const fullNode = graph.nodes.find((node) => node.id === exportNode.id);
    const sourceRefs =
      fullNode && isConceptNode(fullNode)
        ? migrateLegacySourceUrlToSourceRefs(fullNode)
        : exportNode.sourceRefs;
    return formatNodeSection(exportNode, sourceRefs);
  });

  return [...headerLines, "", ...sections].join("\n").trimEnd() + "\n";
}
