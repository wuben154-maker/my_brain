import { Alert, Pressable, StyleSheet, Text } from "react-native";

import { hydrateMobileStores } from "../stores/persistHydrate";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { getStorageSession } from "../storage/storageSession";
import { resetDemoOnSession } from "../demo/resetDemoOnSession";
import { brainTheme, spacing, typography, type ThemeMode } from "../theme/tokens";

interface Props {
  themeMode?: ThemeMode;
  testID?: string;
}

/** Dev-only demo reset — wipes local graph/profile/provisional to labeled fixtures. */
export function DemoResetDevButton({ themeMode = "dark", testID = "demo-reset-dev-button" }: Props) {
  const theme = brainTheme[themeMode];

  const onPress = () => {
    Alert.alert(
      "重置演示数据",
      "将清空本地图谱/候选/画像并装入 demo_fixture 种子。不会导出你当前的数据。Provider 配置默认保留。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "重置",
          style: "destructive",
          onPress: () => {
            const session = getStorageSession();
            if (!session) {
              return;
            }
            resetDemoOnSession(session.storage, { preserveProviderConfig: true });
            const bundle = session.storage.hydrateBundle();
            hydrateMobileStores(bundle, useMobileAppStore.getState().hasApiKey, true);
          },
        },
      ],
    );
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="重置演示数据"
      testID={testID}
      style={styles.row}
    >
      <Text style={[styles.label, { color: theme.warning }]}>重置演示数据（demo_fixture）</Text>
      <Text style={[styles.hint, { color: theme.textTertiary }]}>
        标记 demoMode · 可重复 · 不 silent 写 permanent 数据
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  label: {
    ...typography.caption,
    fontWeight: "600",
  },
  hint: {
    fontSize: 10,
    marginTop: spacing.xs,
  },
});
