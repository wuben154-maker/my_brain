import { chromium } from "playwright";
import path from "node:path";
import { PATHS } from "./config.mjs";

const targets = [
  {
    id: "boot-full",
    url: "http://localhost:1420/?visual=boot",
    wait: "[data-testid='boot-self-check']",
    out: path.join(PATHS.actualDir, "boot-full.png"),
  },
  {
    id: "companion-full",
    url: "http://localhost:1420/?visual=companion",
    wait: "[data-testid='immersive-scene']",
    out: path.join(PATHS.actualDir, "companion-full.png"),
  },
];

const browser = await chromium.launch();
for (const target of targets) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(target.url, { waitUntil: "networkidle" });
  await page.waitForSelector(target.wait, { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: target.out });
  console.log("saved", target.out);
  await page.close();
}
await browser.close();
