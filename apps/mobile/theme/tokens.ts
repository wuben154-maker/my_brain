/** Design tokens — aligned with specs/mobile-app/assets/ui/DESIGN_SYSTEM.md §2–§4 */

/** Traceability anchor for Warm Ink UI contract assets (read-only in CK-07). */
export const warmInkUiSource = {
  contractDir: "app-development/UI",
  designSystem: "specs/mobile-app/assets/ui/DESIGN_SYSTEM.md",
} as const;

export type ThemeMode = "light" | "dark";

export type ThemeColors = {
  background: string;
  backgroundElevated: string;
  surface: string;
  surfaceMuted: string;
  primary: string;
  primaryMuted: string;
  accent: string;
  accentMuted: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  constellationNode: string;
  constellationNodeDim: string;
  constellationLine: string;
  orbGlow: string;
};

export type UserMode =
  | "tech_tracker"
  | "learner"
  | "creator_researcher"
  | "founder_project"
  | "personal_memory";

export type IntentKey = "ingest" | "skip" | "detail";

export const fontFamily = {
  display: "DM Sans",
  body: "Noto Sans SC",
  caption: "DM Sans",
} as const;

export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  /** Secondary list cards in UI mockups (rx 20–22). */
  card: 20,
  lg: 24,
  full: 9999,
} as const;

export const opacity = {
  disabled: 0.5,
  pressed: 0.88,
} as const;

/** Text on saturated primary CTA surfaces — SVG `.buttonText { fill: #FFFFFF }`. */
export const textOnPrimary = "#FFFFFF" as const;

/** Orbit star tint from splash/home SVG radial gradient stops (`#BCC5FF`). */
export const starOrbitTint = "#BCC5FF" as const;

/** ui-06 map capture — pan hint matches SVG caption placement. */
export const mapFixturePanHint = {
  top: 16,
  right: 20,
} as const;

export const typography = {
  hero: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.display,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.display,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: fontWeight.regular,
    fontFamily: fontFamily.body,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: fontWeight.medium,
    fontFamily: fontFamily.caption,
  },
  micro: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: fontWeight.medium,
    fontFamily: fontFamily.caption,
  },
} as const;

/**
 * Snapshot of Warm Ink palette from `app-development/UI` SVGs + DESIGN_SYSTEM §2.
 * Tests assert `brainTheme` stays aligned without parsing SVG at runtime.
 */
export const warmInkColorContract = {
  dark: {
    background: "#14161C",
    backgroundElevated: "#1A1D26",
    surface: "#1E2129",
    surfaceMuted: "#252932",
    primary: "#7B8CFF",
    primaryMuted: "#7B8CFF14",
    accent: "#FF8A7A",
    accentMuted: "#FF8A7A18",
    text: "#F4F2EF",
    textSecondary: "#9BA3B4",
    textTertiary: "#6B7280",
    border: "#FFFFFF12",
  },
  light: {
    background: "#F7F5F2",
    backgroundElevated: "#EFEDE8",
    surface: "#FFFFFF",
    surfaceMuted: "#F0EEEA",
    primary: "#5B6FE8",
    primaryMuted: "#5B6FE812",
    accent: "#E86B5A",
    accentMuted: "#E86B5A14",
    text: "#1A1D24",
    textSecondary: "#6B7280",
    textTertiary: "#9CA3AF",
    border: "#1A1D240F",
  },
} as const;

export const brainTheme = {
  dark: {
    background: "#14161C",
    backgroundElevated: "#1A1D26",
    surface: "#1E2129",
    surfaceMuted: "#252932",
    primary: "#7B8CFF",
    primaryMuted: "#7B8CFF14",
    accent: "#FF8A7A",
    accentMuted: "#FF8A7A18",
    text: "#F4F2EF",
    textSecondary: "#9BA3B4",
    textTertiary: "#6B7280",
    border: "#FFFFFF12",
    success: "#6BC9A8",
    warning: "#E8B86D",
    error: "#E87A8A",
    constellationNode: "#F4F2EF",
    constellationNodeDim: "#9BA3B466",
    constellationLine: "#7B8CFF22",
    orbGlow: "#7B8CFF33",
  },
  light: {
    background: "#F7F5F2",
    backgroundElevated: "#EFEDE8",
    surface: "#FFFFFF",
    surfaceMuted: "#F0EEEA",
    primary: "#5B6FE8",
    primaryMuted: "#5B6FE812",
    accent: "#E86B5A",
    accentMuted: "#E86B5A14",
    text: "#1A1D24",
    textSecondary: "#6B7280",
    textTertiary: "#9CA3AF",
    border: "#1A1D240F",
    success: "#3D9B7A",
    warning: "#C9923E",
    error: "#D45D6F",
    constellationNode: "#1A1D24",
    constellationNodeDim: "#9CA3AF88",
    constellationLine: "#5B6FE820",
    orbGlow: "#5B6FE828",
  },
  modeAccent: {
    tech_tracker: { dark: "#6B9FFF", light: "#4A7FE8" },
    learner: { dark: "#9B8CFF", light: "#7B6FE8" },
    creator_researcher: { dark: "#FFB87A", light: "#E8A05A" },
    founder_project: { dark: "#7BD4A8", light: "#4AB88A" },
    personal_memory: { dark: "#FF9EC4", light: "#E87AA8" },
  },
  intentLabels: {
    ingest: "记住这个",
    skip: "先不用",
    detail: "多说点",
  },
} as const satisfies {
  dark: ThemeColors;
  light: ThemeColors;
  modeAccent: Record<UserMode, { dark: string; light: string }>;
  intentLabels: Record<IntentKey, string>;
};

/**
 * Safe-area contract — root `App.tsx` SafeAreaView owns the OS status-bar inset.
 * Screens use `screenTopChrome` for layout below that inset (never magic 48).
 */
export const safeArea = {
  screenTopChrome: spacing.sm,
  statusBarBackground: {
    dark: brainTheme.dark.background,
    light: brainTheme.light.background,
  },
} as const;

/** @deprecated Prefer brainTheme.dark — kept for incremental migration */
export const colors = {
  background: brainTheme.dark.background,
  surface: brainTheme.dark.surface,
  primary: brainTheme.dark.primary,
  accent: brainTheme.dark.accent,
  text: brainTheme.dark.text,
  textMuted: brainTheme.dark.textSecondary,
  danger: brainTheme.dark.error,
  success: brainTheme.dark.success,
} as const;

export const copy = {
  intents: {
    ingest: brainTheme.intentLabels.ingest,
    skip: brainTheme.intentLabels.skip,
    explain: brainTheme.intentLabels.detail,
  },
  home: {
    emptySubtitle: "这里还空着。第一颗星，会来自你的话。",
    emptyTitle: "这里还空着",
    emptyBodyLine1: "聊几句，我就知道怎么陪你。",
    emptyBodyLine2: "第一颗星，会来自你的话。",
    startChat: "开始聊",
    quickCapture: "先随手记一下",
    voiceHint: "也可以直接说给我听",
    todayFocusFallbackTitle: "今天值得继续的一件事",
  },
} as const;

export function getThemeColors(mode: ThemeMode = "dark"): ThemeColors {
  return brainTheme[mode];
}

export function getModeAccent(mode: UserMode, themeMode: ThemeMode = "dark"): string {
  return brainTheme.modeAccent[mode][themeMode];
}

export const shadows = {
  darkCard: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#FFFFFF12",
  },
  lightCard: {
    shadowColor: "#1A1D24",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#1A1D240F",
  },
} as const;
