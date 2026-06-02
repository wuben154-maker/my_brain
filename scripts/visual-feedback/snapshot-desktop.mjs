#!/usr/bin/env node
// Throwaway desktop full-page snapshot helper for implement-to-match work.
// Captures the running app at a desktop viewport so we can compare the whole
// HUD against the concept art (not just the cropped regions visual:* uses).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = path.join(ROOT, "artifacts", "visual-feedback", "desktop");
const BASE = process.env.VISUAL_BASE_URL ?? "http://localhost:1420";

const TARGETS = [
  // `?graphDemo` seeds the demo graph and flips phase -> ready, so the full
  // dashboard chrome (TopBar / NavRail / GraphHeader / stats) renders.
  { id: "dashboard", urlPath: "/?graphDemo", wait: "[data-testid='main-shell']" },
];

const VIEWPORT = { width: 1440, height: 960 };

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const target of TARGETS) {
      const page = await browser.newPage({
        viewport: VIEWPORT,
        deviceScaleFactor: 1,
      });
      await page.goto(new URL(target.urlPath, BASE).href, {
        waitUntil: "networkidle",
      });
      await page.waitForSelector(target.wait, { timeout: 15000 });
      await page.waitForTimeout(1500);
      const out = path.join(OUT_DIR, `${target.id}.png`);
      await page.screenshot({ path: out, fullPage: false });
      await page.close();
      console.log(`[snapshot-desktop] ${target.id} -> ${out}`);
    }
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
