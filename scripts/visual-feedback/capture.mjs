#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { DEV_SERVER_URL, PATHS, VISUAL_TARGETS } from "./config.mjs";
import { readPng } from "./png-utils.mjs";

async function waitForServer(url, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Dev server not reachable at ${url}. Run: pnpm dev`);
}

export async function captureAllScreenshots(baseUrl = DEV_SERVER_URL) {
  await waitForServer(baseUrl);
  fs.mkdirSync(PATHS.actualDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const target of VISUAL_TARGETS) {
      const referencePath = path.join(PATHS.assets, target.referenceFile);
      const reference = readPng(referencePath);
      const page = await browser.newPage({
        viewport: { width: reference.width, height: reference.height },
        deviceScaleFactor: 1,
      });
      await page.goto(new URL(target.urlPath, baseUrl).href, {
        waitUntil: "networkidle",
      });
      await page.waitForSelector(target.waitSelector, { timeout: 15000 });
      await page.waitForFunction(() => document.fonts.ready, null, {
        timeout: 15000,
      });
      if (target.id === "main") {
        await page.waitForSelector(".graph-canvas-shell canvas", {
          timeout: 15000,
        });
        await page.waitForTimeout(1200);
      } else {
        await page.waitForTimeout(400);
      }

      const locator = page.locator(target.captureSelector);
      await locator.waitFor({ state: "visible", timeout: 10000 });

      const outPath = path.join(PATHS.actualDir, `${target.id}.png`);
      await locator.screenshot({ path: outPath });
      await page.close();

      results.push({
        id: target.id,
        path: outPath,
        width: reference.width,
        height: reference.height,
      });
      console.log(`[visual:capture] ${target.id} → ${outPath}`);
    }
  } finally {
    await browser.close();
  }

  return results;
}

const isMain =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  captureAllScreenshots().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
