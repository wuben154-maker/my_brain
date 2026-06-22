import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { registerNavigationBridge } from "./navigationBridge";
import { INITIAL_ROUTE, type RouteName } from "./routes";

export interface NavigationContextValue {
  stack: RouteName[];
  navigate: (name: RouteName) => void;
  goBack: () => void;
  canGoBack: boolean;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<RouteName[]>([INITIAL_ROUTE]);

  const navigate = useCallback((name: RouteName) => {
    setStack((current) => {
      if (current[current.length - 1] === name) {
        return current;
      }
      return [...current, name];
    });
  }, []);

  const goBack = useCallback(() => {
    setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }, []);

  const value = useMemo<NavigationContextValue>(
    () => ({
      stack,
      navigate,
      goBack,
      canGoBack: stack.length > 1,
    }),
    [stack, navigate, goBack],
  );

  registerNavigationBridge({ navigate, goBack });

  return (
    <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return ctx;
}
