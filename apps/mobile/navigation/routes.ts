export const Routes = {
  LivingBrainHome: "LivingBrainHome",
  Today: "Today",
  CaptureInbox: "CaptureInbox",
  BrainMap: "BrainMap",
  MemoryReview: "MemoryReview",
  Settings: "Settings",
  ProviderSettings: "ProviderSettings",
} as const;

export type RouteName = (typeof Routes)[keyof typeof Routes];

export const INITIAL_ROUTE: RouteName = Routes.LivingBrainHome;
