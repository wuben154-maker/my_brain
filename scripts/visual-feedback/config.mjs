import path from "node:path";

import { fileURLToPath } from "node:url";



const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");



export const PATHS = {

  root: ROOT,

  assets: path.join(ROOT, "assets"),

  artifacts: path.join(ROOT, "artifacts", "visual-feedback"),

  actualDir: path.join(ROOT, "artifacts", "visual-feedback", "actual"),

  diffDir: path.join(ROOT, "artifacts", "visual-feedback", "diff"),

  refCropDir: path.join(ROOT, "artifacts", "visual-feedback", "reference-crops"),

  reportFile: path.join(ROOT, "artifacts", "visual-feedback", "report.json"),

};



/**

 * Concept art is full-dashboard; MVP compares implementable regions only.

 * referenceCrop: slice from assets/*.png

 * captureSelector: element screenshot from ?visual=* page

 */

export const VISUAL_TARGETS = [

  {

    id: "boot",

    label: "启动自检 · 诊断区",

    referenceFile: "boot-self-check.png",

    urlPath: "/?visual=boot",

    waitSelector: "[data-testid='boot-self-check']",

    captureSelector: "[data-testid='boot-diagnostics']",

    referenceCrop: { x: 0.56, y: 0.17, w: 0.38, h: 0.46 },

    maxDiffRatio: 0.15,

    ignoreRects: [{ x: 0, y: 0, w: 0.195, h: 1 }],

  },

  {

    id: "companion",

    label: "沉浸式伴侣 · 星图+光球",

    referenceFile: "main-ui-graph-voice.png",

    urlPath: "/?visual=companion",

    waitSelector: "[data-testid='immersive-scene']",

    captureSelector: "[data-testid='immersive-scene']",

    // Crop concept left rail so graph+voice align with immersive-scene capture.
    referenceCrop: { x: 0.048, y: 0, w: 0.952, h: 1 },

    maxDiffRatio: 0.28,

    // Intentionally omitted dead chrome — compare implementable regions only.
    ignoreRects: [
      { x: 0.22, y: 0, w: 0.78, h: 0.058 },
      { x: 0.54, y: 0.058, w: 0.13, h: 0.052 },
      { x: 0.66, y: 0.31, w: 0.34, h: 0.46 },
    ],

  },

  {

    id: "inbox",

    label: "收件箱 · 同意→空态",

    referenceFile: "inbox-approve-empty.png",

    urlPath: "/?visual=inbox",

    waitSelector: "[data-testid='proposal-card-visual-prop-create-1']",

    captureSelector: "[data-testid='proposal-inbox-drawer']",

    interactionSteps: [

      {

        type: "click",

        selector:

          "[data-testid='proposal-card-visual-prop-create-1'] button:has-text('同意')",

      },

      {

        type: "waitSelector",

        selector: "[data-testid='proposal-inbox-empty']",

        timeout: 15000,

      },

    ],

    referenceCrop: { x: 0, y: 0, w: 1, h: 1 },

    maxDiffRatio: 0.22,

    ignoreRects: [],

  },

  {

    id: "insight",

    label: "洞察 · 轨迹 + 预览到星图",

    referenceFile: "insight-trace-preview.png",

    urlPath: "/?visual=insight",

    waitSelector: "[data-testid='research-trace']",

    captureSelector: "[data-testid='section-insight']",

    interactionSteps: [

      {

        type: "click",

        selector: "[data-testid='proposal-preview-show-on-graph']",

        force: true,

      },

      {

        type: "waitSelector",

        selector: "[data-testid='proposal-preview-clear']",

        timeout: 15000,

      },

    ],

    referenceCrop: { x: 0, y: 0, w: 1, h: 1 },

    maxDiffRatio: 0.24,

    ignoreRects: [],

  },

];



export const DEV_SERVER_URL =

  process.env.VISUAL_BASE_URL ?? "http://localhost:1420";



export const LOOP_DEFAULT_MAX_ROUNDS = Number(

  process.env.VISUAL_MAX_ROUNDS ?? "24",

);



export const LOOP_PASS_STREAK_REQUIRED = 2;

/** V7: default loop runs boot + companion; legacy inbox/insight only with --legacy-visual. */
export function resolveVisualTargets(argv = process.argv.slice(2)) {
  const args = new Set(argv);
  if (args.has("--legacy-visual")) {
    return VISUAL_TARGETS;
  }
  if (args.has("--companion")) {
    return VISUAL_TARGETS.filter((target) =>
      ["boot", "companion"].includes(target.id),
    );
  }
  return VISUAL_TARGETS.filter((target) =>
    ["boot", "companion"].includes(target.id),
  );
}

