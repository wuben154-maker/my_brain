import type { RouteName } from "./routes";

export interface NavigationBridge {
  navigate: (name: RouteName) => void;
  goBack: () => void;
}

let bridge: NavigationBridge | null = null;

export function registerNavigationBridge(next: NavigationBridge | null): void {
  bridge = next;
}

export function navigationNavigate(name: RouteName): void {
  bridge?.navigate(name);
}

export function navigationGoBack(): void {
  bridge?.goBack();
}
