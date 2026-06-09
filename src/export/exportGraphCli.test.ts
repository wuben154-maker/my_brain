import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const projectRoot = join(import.meta.dirname, "../..");
const cliScript = join(projectRoot, "scripts/export-graph.mjs");

describe.sequential("export-graph CLI smoke", () => {
  const jsonOut = join(projectRoot, "tmp/export-graph-cli-smoke.json");
  const mdOut = join(projectRoot, "tmp/export-graph-cli-smoke.md");
  const nestedOut = join(projectRoot, "tmp/nested/cli-smoke.json");

  async function cleanup(): Promise<void> {
    await rm(jsonOut, { force: true });
    await rm(mdOut, { force: true });
    await rm(nestedOut, { force: true });
  }

  it("writes JSON to a custom --out path", async () => {
    await cleanup();
    const { stdout } = await execFileAsync(
      process.execPath,
      [cliScript, "--format", "json", "--out", jsonOut],
      { cwd: projectRoot },
    );
    expect(stdout).toBe(`export-graph: wrote json export to ${jsonOut}\n`);

    const parsed = JSON.parse(await readFile(jsonOut, "utf8")) as {
      schemaVersion: string;
      nodes: unknown[];
    };
    expect(parsed.schemaVersion).toBe("my-brain-graph/1.0");
    expect(parsed.nodes.length).toBeGreaterThan(0);
    await rm(jsonOut, { force: true });
  }, 120_000);

  it("writes markdown to a custom --out path", async () => {
    await cleanup();
    const { stdout } = await execFileAsync(
      process.execPath,
      [cliScript, "--format", "markdown", "--out", mdOut],
      { cwd: projectRoot },
    );
    expect(stdout).toBe(`export-graph: wrote markdown export to ${mdOut}\n`);

    const text = await readFile(mdOut, "utf8");
    expect(text).toContain("# my_brain Graph Export");
    expect(text).toContain("## ");
    expect(text).toMatch(/\*\*Sources:\*\*/);
    await rm(mdOut, { force: true });
  }, 120_000);

  it("creates parent directories for nested --out paths", async () => {
    await cleanup();
    await execFileAsync(
      process.execPath,
      [cliScript, "--format", "json", "--out", nestedOut],
      { cwd: projectRoot },
    );
    const parsed = JSON.parse(await readFile(nestedOut, "utf8")) as {
      schemaVersion: string;
    };
    expect(parsed.schemaVersion).toBe("my-brain-graph/1.0");
    await rm(join(projectRoot, "tmp/nested"), { recursive: true, force: true });
  }, 120_000);
});
