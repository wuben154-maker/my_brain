import { StyleSheet, View } from "react-native";

import { SettingRow } from "./ui/SettingRow";
import { spacing, type ThemeMode } from "../theme/tokens";

export interface HomeLightEntriesProps {
  pendingCount: number;
  themeMode?: ThemeMode;
  onCapturePress: () => void;
  onBrainMapPress: () => void;
  onMemoryReviewPress: () => void;
  testID?: string;
}

export function HomeLightEntries({
  pendingCount,
  themeMode = "dark",
  onCapturePress,
  onBrainMapPress,
  onMemoryReviewPress,
  testID = "home-light-entries",
}: HomeLightEntriesProps) {
  return (
    <View style={styles.wrap} testID={testID}>
      <SettingRow
        title="待点亮星尘"
        subtitle={pendingCount > 0 ? "有候选等待你的决定" : "随手记下的会先在这里"}
        value={pendingCount > 0 ? String(pendingCount) : undefined}
        onPress={onCapturePress}
        themeMode={themeMode}
        testID="home-capture-inbox-entry"
        accessibilityLabel={`待点亮星尘${pendingCount > 0 ? `，${pendingCount} 条待处理` : ""}`}
      />
      <SettingRow
        title="知识星图"
        subtitle="探索概念、来源与关系"
        onPress={onBrainMapPress}
        themeMode={themeMode}
        testID="home-brain-map-entry"
        accessibilityLabel="知识星图"
      />
      <SettingRow
        title="记忆回顾"
        subtitle="本周脉络、回放与反向提问"
        onPress={onMemoryReviewPress}
        themeMode={themeMode}
        testID="home-memory-review-entry"
        accessibilityLabel="记忆回顾"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.sm,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
});
