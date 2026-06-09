export type ExportFormat = "json" | "markdown";

const DEFAULT_OUT: Record<ExportFormat, string> = {
  json: "tmp/showcase-graph.json",
  markdown: "tmp/showcase-graph.md",
};

export function normalizeExportFormat(raw: string): ExportFormat | undefined {
  const lower = raw.toLowerCase();
  if (lower === "json") return "json";
  if (lower === "md" || lower === "markdown") return "markdown";
  return undefined;
}

export function parseExportGraphArgs(argv: string[]): {
  format: ExportFormat | undefined;
  out: string;
} {
  let formatRaw = "json";
  let out: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--format" || arg === "-f") {
      const next = argv[++i];
      if (next !== undefined) formatRaw = next;
    } else if (arg.startsWith("--format=")) {
      formatRaw = arg.slice("--format=".length);
    } else if (arg === "--out" || arg === "-o") {
      const next = argv[++i];
      if (next !== undefined) out = next;
    } else if (arg.startsWith("--out=")) {
      out = arg.slice("--out=".length);
    }
  }

  const format = normalizeExportFormat(formatRaw);
  const resolvedOut =
    out ?? (format === "markdown" ? DEFAULT_OUT.markdown : DEFAULT_OUT.json);

  return { format, out: resolvedOut };
}
