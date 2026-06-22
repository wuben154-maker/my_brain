import type { ComponentType } from "react";
import { StyleSheet, View } from "react-native";

import { LivingBrainHome } from "../screens/LivingBrainHome";
import { ProviderSettingsScreen } from "../screens/ProviderSettingsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { TodayScreen } from "../screens/TodayScreen";
import { CaptureInboxScreen } from "../screens/CaptureInboxScreen";
import { BrainMapScreen } from "../screens/BrainMapScreen";
import { MemoryReviewScreen } from "../screens/MemoryReviewScreen";
import { NavigationProvider, useNavigation } from "./NavigationContext";
import { Routes, type RouteName } from "./routes";
import { colors } from "../theme/tokens";

const SCREEN_MAP: Record<RouteName, ComponentType> = {
  [Routes.LivingBrainHome]: LivingBrainHome,
  [Routes.Today]: TodayScreen,
  [Routes.CaptureInbox]: CaptureInboxScreen,
  [Routes.BrainMap]: BrainMapScreen,
  [Routes.MemoryReview]: MemoryReviewScreen,
  [Routes.Settings]: SettingsScreen,
  [Routes.ProviderSettings]: ProviderSettingsScreen,
};

function RootNavigatorInner() {
  const { stack } = useNavigation();
  const currentRoute = stack[stack.length - 1] ?? Routes.LivingBrainHome;
  const Screen = SCREEN_MAP[currentRoute];

  return (
    <View style={styles.root} testID="root-navigator">
      <Screen />
    </View>
  );
}

export function RootNavigator() {
  return (
    <NavigationProvider>
      <RootNavigatorInner />
    </NavigationProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
