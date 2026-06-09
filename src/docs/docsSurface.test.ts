import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

const readDoc = (path: string) => readFileSync(join(REPO_ROOT, path), "utf8");

describe("KOS-A4 docs surface", () => {
  const requiredDocs = [
    "docs/DEMO.md",
    "docs/ARCHITECTURE.md",
    "docs/SHOWCASE_MOCK_LIVE.md",
    "docs/video/SHOWCASE_SCRIPT.md",
  ];

  it("ships the required showcase documents", () => {
    for (const path of requiredDocs) {
      expect(existsSync(join(REPO_ROOT, path)), `${path} must exist`).toBe(true);
    }
  });

  it("links the README showcase entry to the detailed docs", () => {
    const readme = readDoc("README.md");

    expect(readme).toContain("Showcase 3 分钟体验");
    expect(readme).toContain("?showcase=1");
    expect(readme).toContain("./docs/DEMO.md");
    expect(readme).toContain("./docs/ARCHITECTURE.md");
    expect(readme).toContain("./docs/SHOWCASE_MOCK_LIVE.md");
    expect(readme).toContain("./docs/KNOWLEDGE_OS_VISION.md");
    expect(readme).toContain("Showcase In 3 Minutes");
  });

  it("anchors docs to the stable showcase fixture ids", () => {
    const docs = requiredDocs.map(readDoc).join("\n");

    expect(docs).toContain("showcase-brief-1");
    expect(docs).toContain("showcase-brief-2");
    expect(docs).toContain("showcase-brief-3");
    expect(docs).toContain("showcase-ingest-graphiti");
    expect(docs).toContain("ingest_link");
    expect(docs).toContain("VITE_SHOWCASE_DEMO");
  });

  it("states the trust boundaries without forbidden promises", () => {
    const docs = ["README.md", ...requiredDocs].map(readDoc).join("\n");

    expect(docs).toContain("新建永久知识节点仅能由用户确认触发");
    expect(docs).toContain("Brain MCP 只读");
    expect(docs).toContain("MemoryProvider");
    expect(docs).toContain("不写图谱");

    const forbiddenClaims = [
      /Showcase[\s\S]{0,40}必须[\s\S]{0,20}API key/i,
      /AI[\s\S]{0,30}自动新建[\s\S]{0,30}永久图谱节点/,
      /Brain MCP[\s\S]{0,30}(可写|可以写|可创建|可更新|可删除)/i,
      /(?<!不)会自动(发|创建)[^\n]{0,20}issue/i,
      /(?<!不)会自动(发|发布)[^\n]{0,20}(文章|博客)/,
    ];

    for (const claim of forbiddenClaims) {
      expect(docs).not.toMatch(claim);
    }
  });
});
