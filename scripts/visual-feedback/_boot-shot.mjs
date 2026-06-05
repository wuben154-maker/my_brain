import { chromium } from "playwright";
import path from "node:path";
import { PATHS } from "./config.mjs";

const url = "http://localhost:1420/?visual=boot";
const out = path.join(PATHS.actualDir, "boot-full.png");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForSelector("[data-testid='boot-self-check']", { timeout: 15000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: out });
await browser.close();
console.log("saved", out);
