import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

export function readPng(filePath) {
  const buffer = fs.readFileSync(filePath);
  return PNG.sync.read(buffer);
}

export function writePng(filePath, png) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

/** @param {{ x: number, y: number, w: number, h: number }} rect normalized 0–1 */
export function cropPng(source, rect) {
  const left = Math.floor(rect.x * source.width);
  const top = Math.floor(rect.y * source.height);
  const width = Math.max(1, Math.floor(rect.w * source.width));
  const height = Math.max(1, Math.floor(rect.h * source.height));
  const cropped = new PNG({ width, height });

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = Math.min(source.width - 1, left + x);
      const srcY = Math.min(source.height - 1, top + y);
      const srcIdx = (source.width * srcY + srcX) << 2;
      const dstIdx = (width * y + x) << 2;
      cropped.data[dstIdx] = source.data[srcIdx];
      cropped.data[dstIdx + 1] = source.data[srcIdx + 1];
      cropped.data[dstIdx + 2] = source.data[srcIdx + 2];
      cropped.data[dstIdx + 3] = source.data[srcIdx + 3];
    }
  }

  return cropped;
}

export function resizePng(source, width, height) {
  const target = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = Math.min(
        source.width - 1,
        Math.floor((x / width) * source.width),
      );
      const srcY = Math.min(
        source.height - 1,
        Math.floor((y / height) * source.height),
      );
      const srcIdx = (source.width * srcY + srcX) << 2;
      const dstIdx = (width * y + x) << 2;
      target.data[dstIdx] = source.data[srcIdx];
      target.data[dstIdx + 1] = source.data[srcIdx + 1];
      target.data[dstIdx + 2] = source.data[srcIdx + 2];
      target.data[dstIdx + 3] = source.data[srcIdx + 3];
    }
  }
  return target;
}

function isIgnored(x, y, width, height, ignoreRects) {
  for (const rect of ignoreRects) {
    const left = Math.floor(rect.x * width);
    const top = Math.floor(rect.y * height);
    const right = Math.floor((rect.x + rect.w) * width);
    const bottom = Math.floor((rect.y + rect.h) * height);
    if (x >= left && x < right && y >= top && y < bottom) {
      return true;
    }
  }
  return false;
}

/**
 * @param {import('pngjs').PNG} reference
 * @param {import('pngjs').PNG} actual
 * @param {{ threshold?: number, ignoreRects?: {x:number,y:number,w:number,h:number}[] }} options
 */
export function comparePngs(reference, actual, options = {}) {
  const { threshold = 0.1, ignoreRects = [] } = options;
  let actualPrepared = actual;
  if (actual.width !== reference.width || actual.height !== reference.height) {
    actualPrepared = resizePng(actual, reference.width, reference.height);
  }

  const { width, height } = reference;
  const maskedActual = new PNG({ width, height });
  maskedActual.data.set(actualPrepared.data);

  let ignored = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isIgnored(x, y, width, height, ignoreRects)) {
        continue;
      }
      ignored++;
      const idx = (width * y + x) << 2;
      maskedActual.data[idx] = reference.data[idx];
      maskedActual.data[idx + 1] = reference.data[idx + 1];
      maskedActual.data[idx + 2] = reference.data[idx + 2];
      maskedActual.data[idx + 3] = reference.data[idx + 3];
    }
  }

  const diff = new PNG({ width, height });
  const rawDiff = pixelmatch(
    reference.data,
    maskedActual.data,
    diff.data,
    width,
    height,
    { threshold, includeAA: true },
  );

  const comparable = width * height - ignored;
  const diffRatio = comparable > 0 ? rawDiff / comparable : 1;
  return {
    width,
    height,
    rawDiff,
    comparablePixels: comparable,
    ignoredPixels: ignored,
    diffRatio,
    diffPng: diff,
    actualPrepared,
  };
}
