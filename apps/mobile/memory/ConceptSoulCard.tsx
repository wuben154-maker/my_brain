import { StyleSheet, Text, View } from "react-native";

import type { GraphNode } from "@my-brain/core";

import { colors } from "../theme/tokens";

interface Props {
  node: GraphNode | null;
  evidenceRefs: string[];
  testID?: string;
}

/** M5 deepen: single-concept card tied to real node evidence (M2 星核衔接). */
export function ConceptSoulCard({
  node,
  evidenceRefs,
  testID = "concept-soul-card",
}: Props) {
  if (!node || evidenceRefs.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={styles.kicker}>概念深聊</Text>
      <Text style={styles.title}>{node.concept}</Text>
      <Text style={styles.intro}>{node.intro}</Text>
      <Text style={styles.evidence} testID="concept-soul-evidence-count">
        证据链 {evidenceRefs.length} 条
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#12151f",
    borderWidth: 1,
    borderColor: "#243049",
  },
  kicker: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
  intro: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 8,
  },
  evidence: {
    color: colors.accent,
    fontSize: 11,
    marginTop: 12,
  },
});
