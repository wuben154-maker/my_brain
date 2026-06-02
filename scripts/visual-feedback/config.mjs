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

    id: "main",

    label: "主界面 · 语音区",

    referenceFile: "main-ui-graph-voice.png",

    urlPath: "/?visual=main",

    waitSelector: "[data-testid='main-shell']",

    captureSelector: "[data-testid='voice-panel']",

    referenceCrop: { x: 0.73, y: 0.05, w: 0.26, h: 0.9 },

    maxDiffRatio: 0.24,

    ignoreRects: [{ x: 0, y: 0.1, w: 1, h: 0.7 }],

  },

];



export const DEV_SERVER_URL =

  process.env.VISUAL_BASE_URL ?? "http://localhost:1420";



export const LOOP_DEFAULT_MAX_ROUNDS = Number(

  process.env.VISUAL_MAX_ROUNDS ?? "24",

);



export const LOOP_PASS_STREAK_REQUIRED = 2;


