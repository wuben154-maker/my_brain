#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PATHS } from "./config.mjs";

function rel(fromDir, target) {
  return path.relative(fromDir, target).split(path.sep).join("/");
}

export function writeHtmlReport(report = null) {
  const reportPath = PATHS.reportFile;
  if (!report && !fs.existsSync(reportPath)) {
    throw new Error(`Missing ${reportPath}. Run pnpm visual:compare first.`);
  }

  const data =
    report ??
    JSON.parse(fs.readFileSync(reportPath, { encoding: "utf8" }));
  const outDir = PATHS.artifacts;
  const outFile = path.join(outDir, "index.html");
  fs.mkdirSync(outDir, { recursive: true });

  const refCropDir = PATHS.refCropDir;
  const cards = data.targets
    .map((target) => {
      const status = target.pass ? "pass" : "fail";
      const refCrop = path.join(refCropDir, `${target.id}.png`);
      const images = [
        {
          label: "设计裁剪",
          src: fs.existsSync(refCrop)
            ? rel(outDir, refCrop)
            : rel(outDir, target.paths?.reference ?? ""),
        },
        {
          label: "当前截图",
          src: rel(outDir, target.paths?.actual ?? ""),
        },
        {
          label: "差异热力图",
          src: rel(outDir, target.paths?.diff ?? ""),
        },
      ];

      const meta = target.error
        ? `<p class="error">${target.error}</p>`
        : `<p class="meta">${target.diffPercent ?? "—"} · 阈值 ≤ ${((target.maxDiffRatio ?? 0) * 100).toFixed(1)}%</p>`;

      return `
<section class="card ${status}">
  <header>
    <h2>${target.label ?? target.id}</h2>
    <span class="badge">${target.pass ? "PASS" : "FAIL"}</span>
  </header>
  ${meta}
  <div class="grid">
    ${images
      .map(
        (img) => `
    <figure>
      <figcaption>${img.label}</figcaption>
      <img src="${img.src}" alt="${img.label}" loading="lazy" />
    </figure>`,
      )
      .join("")}
  </div>
</section>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Visual Feedback · ${data.pass ? "PASS" : "FAIL"}</title>
  <style>
    :root { color-scheme: dark; --bg: #0a0e14; --panel: #121820; --border: #243044; --pass: #3dd68c; --fail: #ff6b6b; --muted: #8b9cb3; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: var(--bg); color: #e8eef7; }
    main { max-width: 1400px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 1.25rem; font-weight: 600; margin: 0 0 8px; }
    .summary { color: var(--muted); margin-bottom: 24px; }
    .card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 20px; }
    .card.pass { border-color: color-mix(in srgb, var(--pass) 40%, var(--border)); }
    .card.fail { border-color: color-mix(in srgb, var(--fail) 50%, var(--border)); }
    header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
    h2 { margin: 0; font-size: 1rem; }
    .badge { font-size: 0.75rem; letter-spacing: 0.08em; padding: 4px 8px; border-radius: 999px; border: 1px solid var(--border); }
    .pass .badge { color: var(--pass); }
    .fail .badge { color: var(--fail); }
    .meta, .error { margin: 0 0 12px; color: var(--muted); font-size: 0.875rem; }
    .error { color: var(--fail); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    figure { margin: 0; }
    figcaption { font-size: 0.75rem; color: var(--muted); margin-bottom: 6px; }
    img { width: 100%; height: auto; border-radius: 8px; border: 1px solid var(--border); background: #000; }
  </style>
</head>
<body>
  <main>
    <h1>截图反馈闭环 · ${data.pass ? "通过" : "未通过"}</h1>
    <p class="summary">生成于 ${data.generatedAt ?? "—"} · 打开此页对照改 CSS / 组件后运行 <code>pnpm visual:loop --watch</code></p>
    ${cards}
  </main>
</body>
</html>`;

  fs.writeFileSync(outFile, html);
  console.log(`[visual:report] ${outFile}`);
  return outFile;
}

const isMain =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    writeHtmlReport();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
