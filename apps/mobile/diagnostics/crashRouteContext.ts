/** In-memory route slug for M6 crash/diagnostic export — no PII. */
let currentRoute = "living-brain-home";
let currentScreen = "LivingBrainHome";

export function setDiagnosticRoute(route: string, screen?: string): void {
  currentRoute = route;
  if (screen) {
    currentScreen = screen;
  }
}

export function getDiagnosticRoute(): { route: string; screen: string } {
  return { route: currentRoute, screen: currentScreen };
}

export function resetDiagnosticRouteForTests(): void {
  currentRoute = "living-brain-home";
  currentScreen = "LivingBrainHome";
}
