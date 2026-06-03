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
      const reference = fs.existsSync(referencePath)
        ? readPng(referencePath)
        : readPng(
            path.join(
              PATHS.assets,
              VISUAL_TARGETS.find((t) => t.id === "main")?.referenceFile ??
                target.referenceFile,
            ),
          );
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
      } else if (target.id === "inbox") {
        await page.waitForSelector("[data-testid='main-shell']", {
          timeout: 15000,
        });
        await page.waitForSelector("[data-testid='proposal-inbox-drawer']", {
          timeout: 15000,
        });
        await page.waitForSelector(".graph-canvas-shell canvas", {
          timeout: 15000,
        });
        await page.waitForTimeout(1200);
      } else if (target.id === "insight") {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForSelector("[data-testid='main-shell']", {
          timeout: 15000,
        });
        await page.waitForSelector("[data-testid='section-insight']", {
          timeout: 15000,
        });
        await page.waitForSelector(
          "[data-testid='proposal-preview-visual-research-run']",
          { timeout: 15000 },
        );
        await page
          .locator("[data-testid='section-insight']")
          .scrollIntoViewIfNeeded();
        await page.waitForTimeout(600);
      } else {
        await page.waitForTimeout(400);
      }

      if (target.interactionSteps?.length) {
        for (const step of target.interactionSteps) {
          if (step.type === "click") {
            await page.locator(step.selector).click({
              timeout: 10000,
              force: step.force === true,
            });
          } else if (step.type === "waitSelector") {
            await page.waitForSelector(step.selector, {
              timeout: step.timeout ?? 10000,
            });
          } else if (step.type === "wait") {
            await page.waitForTimeout(step.ms ?? 400);
          }
        }
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
