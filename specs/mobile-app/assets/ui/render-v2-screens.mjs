/**
 * Export v2 mobile UI reference PNGs from local HTML files.
 * Usage:
 *   node specs/mobile-app/assets/ui/generate-v2-adaptive-screens.mjs
 *   node specs/mobile-app/assets/ui/render-v2-screens.mjs
 */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const adaptiveSlugs = ["tech", "learner", "creator", "founder", "memory"];

const targets = [
  {
    html: path.join(__dirname, "v2-launch-reference.html"),
    png: path.join(__dirname, "v2-launch-reference.png"),
    selector: ".phone",
  },
  {
    html: path.join(__dirname, "v2-home-reference.html"),
    png: path.join(__dirname, "v2-home-reference.png"),
    selector: ".phone",
  },
  ...adaptiveSlugs.map((slug) => ({
    html: path.join(__dirname, `v2-home-adaptive-${slug}-reference.html`),
    png: path.join(__dirname, `v2-home-adaptive-${slug}-reference.png`),
    selector: ".phone",
  })),
  {
    html: path.join(__dirname, "v2-home-star-tap-reference.html"),
    png: path.join(__dirname, "v2-home-star-tap-reference.png"),
    selector: ".phone",
  },
];

const browser = await chromium.launch();
for (const target of targets) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  const fileUrl = `file:///${target.html.replace(/\\/g, "/")}`;
  await page.goto(fileUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(800);
  const el = page.locator(target.selector);
  await el.screenshot({ path: target.png });
  console.log("saved", target.png);
  await page.close();
}
await browser.close();
