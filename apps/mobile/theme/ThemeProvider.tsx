import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";

import { useMobileAppStore } from "../stores/mobileAppStore";
import { resolveThemeMode } from "./appearancePreference";
import {
  brainTheme,
  getThemeColors,
  type ThemeColors,
  type ThemeMode,
} from "./tokens";

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: "dark",
  colors: brainTheme.dark,
});

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Test override — skips store + system resolution */
  mode?: ThemeMode;
}

function ThemeProviderBody({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: ThemeMode;
}) {
  const value = useMemo(
    () => ({
      mode,
      colors: getThemeColors(mode),
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function ThemeProviderWithSystem({ children }: { children: React.ReactNode }) {
  const appearancePreference = useMobileAppStore((s) => s.appearancePreference);
  const systemScheme = useColorScheme();
  const mode = resolveThemeMode(
    appearancePreference,
    systemScheme === "light" ? "light" : "dark",
  );

  return <ThemeProviderBody mode={mode}>{children}</ThemeProviderBody>;
}

export function ThemeProvider({ children, mode: modeOverride }: ThemeProviderProps) {
  if (modeOverride) {
    return <ThemeProviderBody mode={modeOverride}>{children}</ThemeProviderBody>;
  }

  return <ThemeProviderWithSystem>{children}</ThemeProviderWithSystem>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
