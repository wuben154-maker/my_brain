import { StyleSheet, Text, View } from "react-native";

import type { GraphNode } from "@my-brain/core";

import { colors } from "../theme/tokens";

interface Props {
  nodes: GraphNode[];
  testID?: string;
}

const MAX_VISIBLE = 80;

export function MemoryCore({ nodes, testID = "memory-core" }: Props) {
  const visible = nodes.filter((n) => !n.archived).slice(0, MAX_VISIBLE);
  const count = visible.length;

  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={styles.title} testID="memory-core-count">
        记忆星核 · {count} / {MAX_VISIBLE}
      </Text>
      <View style={styles.field}>
        {count === 0 ? (
          <View style={styles.pendingStar} testID="memory-core-pending">
            <Text style={styles.starGlyph}>✦</Text>
            <Text style={styles.pendingLabel}>待点亮</Text>
          </View>
        ) : (
          visible.map((node) => (
            <View key={node.id} style={styles.star} testID={`memory-node-${node.id}`}>
              <Text style={styles.starGlyph}>★</Text>
              <Text style={styles.starLabel} numberOfLines={1}>
                {node.concept}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 8,
    minHeight: 140,
  },
  title: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  field: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: "#0d1018",
    borderRadius: 20,
    padding: 16,
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingStar: {
    alignItems: "center",
  },
  star: {
    alignItems: "center",
    width: 72,
  },
  starGlyph: {
    color: colors.accent,
    fontSize: 22,
  },
  starLabel: {
    color: colors.text,
    fontSize: 10,
    marginTop: 2,
    maxWidth: 68,
    textAlign: "center",
  },
  pendingLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
});
