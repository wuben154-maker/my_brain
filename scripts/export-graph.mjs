#!/usr/bin/env node
/**
 * F2 — export showcase/mock graph to markdown or JSON (local file only).
 * Uses Vite SSR module load so Node 20 can import TypeScript without extra deps.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

async function loadExportModules() {
  const server = await createServer({
    configFile: false,
    root: projectRoot,
    logLevel: "error",
    resolve: {
      alias: {
        "@": join(projectRoot, "src"),
      },
    },
  });
  try {
    await server.pluginContainer.buildStart({});
    const markdown = await server.ssrLoadModule("/src/export/exportGraphMarkdown.ts");
    const json = await server.ssrLoadModule("/src/export/exportGraphJson.ts");
    const fixtures = await server.ssrLoadModule("/src/showcase/showcaseFixtures.ts");
    const cliArgs = await server.ssrLoadModule("/src/export/exportGraphCliArgs.ts");
    return { markdown, json, fixtures, cliArgs };
  } finally {
    await server.close();
  }
}

function usage() {
  process.stderr.write(
    "Usage: pnpm export:graph -- --format json|markdown|md --out <path>\n",
  );
}

const { markdown, json, fixtures, cliArgs } = await loadExportModules();
const { format, out } = cliArgs.parseExportGraphArgs(process.argv.slice(2));
if (format !== "json" && format !== "markdown") {
  usage();
  process.exit(1);
}

const graph = fixtures.SHOWCASE_GRAPH_SNAPSHOT;
const options = { exportedAt: fixtures.SHOWCASE_NOW };

let contents;
if (format === "markdown") {
  contents = markdown.exportGraphMarkdown(graph, options);
} else {
  contents = `${JSON.stringify(json.exportGraphJson(graph, options), null, 2)}\n`;
}

try {
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, contents, "utf8");
  process.stdout.write(`export-graph: wrote ${format} export to ${out}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`export-graph: failed to write ${out}: ${message}\n`);
  process.exit(1);
}
