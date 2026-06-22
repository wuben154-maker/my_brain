import { StyleSheet, Text, View } from "react-native";

import { PageHeader } from "../components/ui/PageHeader";
import { safeArea } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { BackButton } from "../navigation/BackButton";
import { useNavigation } from "../navigation/NavigationContext";

export interface PlaceholderScreenProps {
  title: string;
  placeholderMessage: string;
  testID: string;
}

export function PlaceholderScreen({
  title,
  placeholderMessage,
  testID,
}: PlaceholderScreenProps) {
  const { goBack } = useNavigation();
  const { mode, colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID={testID}>
      <PageHeader
        title={title}
        themeMode={mode}
        leftSlot={<BackButton onPress={goBack} />}
      />
      <Text
        style={[styles.placeholder, { color: colors.textSecondary }]}
        testID={`${testID}-placeholder`}
      >
        {placeholderMessage}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: safeArea.screenTopChrome,
  },
  placeholder: {
    paddingHorizontal: 16,
    paddingTop: 24,
    fontSize: 16,
    lineHeight: 24,
  },
});
