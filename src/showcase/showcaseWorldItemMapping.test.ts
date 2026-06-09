import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  SHOWCASE_BRIEFING_ITEMS,
  SHOWCASE_WORLD_ITEMS,
} from "@/showcase/showcaseFixtures";
import { projectWorldItemToNewsItem } from "@/radar/worldSources/worldSourceAdapter";

describe("showcase WorldItem mapping", () => {
  it("maps the three A1 briefing items one-to-one", () => {
    expect(SHOWCASE_WORLD_ITEMS).toHaveLength(3);
    expect(SHOWCASE_WORLD_ITEMS.map((item) => item.id)).toEqual([
      "radar-wi-showcase-1",
      "radar-wi-showcase-2",
      "radar-wi-showcase-3",
    ]);
    expect(SHOWCASE_WORLD_ITEMS.map((item) => item.sourceItemId)).toEqual([
      "showcase-brief-1",
      "showcase-brief-2",
      "showcase-brief-3",
    ]);
  });

  it("projects showcase WorldItems back to the A1 briefing fields", () => {
    expect(SHOWCASE_WORLD_ITEMS.map(projectWorldItemToNewsItem)).toEqual(
      SHOWCASE_BRIEFING_ITEMS,
    );
  });

  it("keeps radar modules away from graph mutation create paths", () => {
    const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
    const radarFiles = [
      ...collectTsFiles(join(sourceRoot, "domain", "radar")),
      ...collectTsFiles(join(sourceRoot, "radar")),
    ];

    for (const file of radarFiles) {
      const content = readFileSync(file, "utf8");
      expect(content).not.toContain("applyGraphMutation");
      expect(content).not.toContain("buildCreateProposalFromNews");
      expect(content).not.toContain("KnowledgeNode");
    }
  });
});

function collectTsFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      return collectTsFiles(path);
    }
    return entry.isFile() && path.endsWith(".ts") ? [path] : [];
  });
}
