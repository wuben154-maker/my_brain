import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/tokens";

interface Props {
  onDone: () => void;
}

export function LaunchScreen({ onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 1200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <View style={styles.root} testID="launch-screen">
      <Text style={styles.logo}>my_brain</Text>
      <Text style={styles.tagline}>你的大脑，慢慢亮起来</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "600",
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: 12,
  },
});
