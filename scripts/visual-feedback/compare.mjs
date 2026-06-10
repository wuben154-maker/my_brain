#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PATHS, resolveVisualTargets } from "./config.mjs";
import { comparePngs, cropPng, readPng, writePng } from "./png-utils.mjs";
import { writeHtmlReport } from "./report-html.mjs";

export function compareAllScreenshots() {
  fs.mkdirSync(PATHS.diffDir, { recursive: true });

  /** @type {import('./types.mjs').VisualCompareReport['targets']} */
  const targets = [];
  let allPass = true;

  for (const target of resolveVisualTargets()) {
    const referencePath = path.join(PATHS.assets, target.referenceFile);
    const actualPath = path.join(PATHS.actualDir, `${target.id}.png`);
    const diffPath = path.join(PATHS.diffDir, `${target.id}.png`);

    if (!fs.existsSync(actualPath)) {
      targets.push({
        id: target.id,
        label: target.label,
        pass: false,
        diffRatio: 1,
        maxDiffRatio: target.maxDiffRatio,
        error: `Missing screenshot: ${actualPath}. Run pnpm visual:capture`,
      });
      allPass = false;
      continue;
    }

    const referenceFull = readPng(referencePath);
    const actual = readPng(actualPath);
    const reference = cropPng(referenceFull, target.referenceCrop);

    fs.mkdirSync(PATHS.refCropDir, { recursive: true });
    writePng(
      path.join(PATHS.refCropDir, `${target.id}.png`),
      reference,
    );

    const result = comparePngs(reference, actual, {
      ignoreRects: target.ignoreRects,
    });
    writePng(diffPath, result.diffPng);

    const pass = result.diffRatio <= target.maxDiffRatio;
    if (!pass) {
      allPass = false;
    }

    targets.push({
      id: target.id,
      label: target.label,
      pass,
      diffRatio: result.diffRatio,
      maxDiffRatio: target.maxDiffRatio,
      diffPercent: `${(result.diffRatio * 100).toFixed(2)}%`,
      rawDiffPixels: result.rawDiff,
      comparablePixels: result.comparablePixels,
      ignoredPixels: result.ignoredPixels,
      viewport: { width: result.width, height: result.height },
      paths: {
        reference: referencePath,
        actual: actualPath,
        diff: diffPath,
      },
    });

    const status = pass ? "PASS" : "FAIL";
    console.log(
      `[visual:compare] ${target.id} ${status} · ${(result.diffRatio * 100).toFixed(2)}% (≤ ${(target.maxDiffRatio * 100).toFixed(1)}%)`,
    );
  }

  const report = {
    generatedAt: new Date().toISOString(),
    pass: allPass,
    targets,
  };

  fs.mkdirSync(PATHS.artifacts, { recursive: true });
  fs.writeFileSync(PATHS.reportFile, JSON.stringify(report, null, 2));
  console.log(`[visual:compare] report → ${PATHS.reportFile}`);
  writeHtmlReport(report);

  return report;
}

const isMain =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  const report = compareAllScreenshots();
  process.exit(report.pass ? 0 : 1);
}
