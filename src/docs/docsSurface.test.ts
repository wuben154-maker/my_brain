import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

const readDoc = (path: string) => readFileSync(join(REPO_ROOT, path), "utf8");

const EVALS_INDEX = "docs/evals/README.md";

const EVAL_CATEGORY_PAGES = [
  "docs/evals/radar-relevance.md",
  "docs/evals/ingest-quality.md",
  "docs/evals/curation-undo.md",
  "docs/evals/profile-growth.md",
  "docs/evals/action-usefulness.md",
] as const;

const MATURITY_DOCS = [
  "README.md",
  "docs/ARCHITECTURE.md",
  "docs/PROJECT_STATUS.md",
  "specs/kos-productization/README.md",
  EVALS_INDEX,
] as const;

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

describe("docsLinks", () => {
  it("ships the KP-06 evals index and five category pages", () => {
    expect(existsSync(join(REPO_ROOT, EVALS_INDEX)), EVALS_INDEX).toBe(true);
    for (const path of EVAL_CATEGORY_PAGES) {
      expect(existsSync(join(REPO_ROOT, path)), `${path} must exist`).toBe(true);
    }
  });

  it("links README and specs index to docs/evals", () => {
    const readme = readDoc("README.md");
    const specsReadme = readDoc("specs/README.md");
    const kpIndex = readDoc("specs/kos-productization/README.md");

    expect(readme).toContain("./docs/evals/README.md");
    expect(specsReadme).toContain("docs/evals/README.md");
    expect(kpIndex).toContain("docs/evals/README.md");
  });

  it("indexes all five eval categories from the evals README", () => {
    const index = readDoc(EVALS_INDEX);

    for (const path of EVAL_CATEGORY_PAGES) {
      const slug = path.replace("docs/evals/", "./");
      expect(index).toContain(slug);
    }
  });

  it("lists pnpm test verification commands on every eval page", () => {
    for (const path of EVAL_CATEGORY_PAGES) {
      const page = readDoc(path);
      expect(page, `${path} must include pnpm test`).toContain("pnpm test --");
    }
  });
});

describe("keywords", () => {
  it("uses consistent three-path wording across maturity docs", () => {
    const corpus = MATURITY_DOCS.map(readDoc).join("\n");

    expect(corpus).toMatch(/Radar 默认/);
    expect(corpus).toContain("?showcase=1");
    expect(corpus).toMatch(/RSS flatten legacy|RSS flatten legacy fallback/);
    expect(corpus).toContain("default");
    expect(corpus).toContain("harness-backed");
    expect(corpus).toContain("experimental");
  });

  it("never labels legacy RSS flatten or showcase as the default path", () => {
    const corpus = MATURITY_DOCS.map(readDoc).join("\n");

    const forbiddenDefaultClaims = [
      /默认主路径[\s\S]{0,60}RSS flatten/i,
      /default path[\s\S]{0,60}RSS flatten legacy/i,
      /RSS flatten legacy[\s\S]{0,40}默认入口/i,
      /RSS flatten legacy[\s\S]{0,40}default launch/i,
      /默认入口[\s\S]{0,40}\?showcase=1/i,
      /default launch[\s\S]{0,40}\?showcase=1/i,
    ];

    for (const claim of forbiddenDefaultClaims) {
      expect(corpus, `forbidden default claim: ${claim}`).not.toMatch(claim);
    }
  });

  it("states Radar mock-first as default without query flag in README", () => {
    const readme = readDoc("README.md");

    expect(readme).toContain("Radar mock-first");
    expect(readme).toContain("无 query flag");
    expect(readme).toMatch(/RSS flatten[\s\S]{0,120}(不是|not)[\s\S]{0,30}(默认|default)/i);
  });
});
