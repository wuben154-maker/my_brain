import manifest from "./manifest.json";
import { DEV_ACTIVE_ROUTE } from "./devActiveRoute";

const ALLOWED = new Set(
  (manifest.screens as Array<{ captureRoute: string }>).map((entry) => entry.captureRoute),
);

function normalizeRoute(route: string | null | undefined): string | null {
  if (!route || !ALLOWED.has(route)) {
    return null;
  }
  return route;
}

/**
 * §10.1 dev-state capture: read fixture route from devActiveRoute.ts (capture script)
 * or EXPO_PUBLIC_VISUAL_FIXTURE_ROUTE. Avoids Expo Dev Client deeplink interception.
 */
export function resolveDevVisualFixtureRoute(): string | null {
  const fromEnv = normalizeRoute(process.env.EXPO_PUBLIC_VISUAL_FIXTURE_ROUTE);
  if (fromEnv) {
    return fromEnv;
  }
  return normalizeRoute(DEV_ACTIVE_ROUTE);
}
