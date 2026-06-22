/** Capture-only session flag (set by App visual-fixture seed; null in normal runtime). */
let activeCaptureRoute: string | null = null;

/** Contract frame for companion baseline PNG captures (390×844). */
export const VISUAL_FIXTURE_BASELINE_FRAME = {
  width: 390,
  height: 844,
} as const;

export type VisualFixtureBaselineFrame = typeof VISUAL_FIXTURE_BASELINE_FRAME;

/** Width-fit scale + vertical center-crop rect (adb/Maestro normalize pipeline). */
export function computeBaselineCropFromDevice(
  deviceWidth: number,
  deviceHeight: number,
  frame: VisualFixtureBaselineFrame = VISUAL_FIXTURE_BASELINE_FRAME,
): {
  scale: number;
  scaledWidth: number;
  scaledHeight: number;
  cropLeft: number;
  cropTop: number;
  outWidth: number;
  outHeight: number;
} {
  const scale = frame.width / deviceWidth;
  const scaledHeight = deviceHeight * scale;
  const scaledWidth = frame.width;
  const cropLeft = 0;
  const cropTop = Math.max(0, Math.floor((scaledHeight - frame.height) / 2));
  return {
    scale,
    scaledWidth,
    scaledHeight: Math.round(scaledHeight),
    cropLeft,
    cropTop,
    outWidth: frame.width,
    outHeight: frame.height,
  };
}

/**
 * Node/adb capture uses the same width-fit + center-crop as `tools/companion-execution/normalize-device-screenshot.mjs`.
 */
export function normalizeDeviceScreenshotToBaselineDimensions(
  deviceWidth: number,
  deviceHeight: number,
  frame: VisualFixtureBaselineFrame = VISUAL_FIXTURE_BASELINE_FRAME,
): { width: number; height: number } {
  const crop = computeBaselineCropFromDevice(deviceWidth, deviceHeight, frame);
  return { width: crop.outWidth, height: crop.outHeight };
}

export function setVisualFixtureCaptureRoute(route: string | null): void {
  activeCaptureRoute = route;
}

export function getVisualFixtureCaptureRoute(): string | null {
  return activeCaptureRoute;
}

export function isVisualFixtureRoute(captureRoute: string): boolean {
  return activeCaptureRoute === captureRoute;
}
