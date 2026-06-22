import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import type { GraphEdge, GraphNode } from "@my-brain/core";

import {
  FIXTURE_DIM_MAP_STARS,
  FIXTURE_MAP_DECORATIVE_EDGES,
  FIXTURE_MAP_VERTICAL_GUIDE,
  fixtureStarVariantForConcept,
  layoutMapNodes,
  layoutMapNodesForVisualFixture,
  visibleEdgesForNodes,
} from "./brainMapModel";
import { ConstellationStar } from "./ui/ConstellationStar";
import { brainTheme, type ThemeMode } from "../theme/tokens";

export type ConstellationFieldMode = "empty" | "populated";

interface Props {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  mode?: ConstellationFieldMode;
  variant?: "home" | "map";
  selectedNodeId?: string | null;
  showArchived?: boolean;
  onSelectNode?: (nodeId: string) => void;
  reducedMotion?: boolean;
  /** CK-08 capture-only: freeze animation + pin nodes to mock layout. */
  visualCaptureFreeze?: boolean;
  themeMode?: ThemeMode;
  testID?: string;
}

const CORE_BREATH_MS = 3600;
const PENDING_STAR_SIZE = 28;
const HOME_NODE_CAP = 12;
function FixtureMapBackdrop({ themeMode }: { themeMode: ThemeMode }) {
  const theme = brainTheme[themeMode];
  return (
    <>
      <View
        pointerEvents="none"
        style={[styles.fixtureBgGlowPrimary, { backgroundColor: theme.primary }]}
        testID="constellation-fixture-bg-glow-primary"
      />
      <View
        pointerEvents="none"
        style={[styles.fixtureBgGlowWarm, { backgroundColor: theme.accent }]}
        testID="constellation-fixture-bg-glow-warm"
      />
    </>
  );
}

const DIM_POSITIONS = [
  { top: "18%", left: "22%" },
  { top: "24%", right: "20%" },
  { bottom: "28%", left: "18%" },
] as const;

function starVariantForNode(
  node: GraphNode,
  selectedNodeId: string | null,
): "lit" | "dim" | "selected" | "warm" {
  if (selectedNodeId === node.id) {
    return "selected";
  }
  if (node.archived) {
    return "dim";
  }
  return "lit";
}

export function ConstellationField({
  nodes = [],
  edges = [],
  mode = "empty",
  variant = "home",
  selectedNodeId = null,
  showArchived = false,
  onSelectNode,
  reducedMotion = false,
  visualCaptureFreeze = false,
  themeMode = "dark",
  testID = "constellation-field",
}: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const fieldHeight = variant === "map" ? undefined : Math.round(windowHeight * 0.45);
  const theme = brainTheme[themeMode];
  const breath = useRef(new Animated.Value(1)).current;
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const motionReduced = reducedMotion || visualCaptureFreeze;

  useEffect(() => {
    if (motionReduced) {
      breath.stopAnimation();
      breath.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1.08,
          duration: CORE_BREATH_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 1,
          duration: CORE_BREATH_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath, motionReduced]);

  const panResponder = useMemo(
    () =>
      variant === "map"
        ? PanResponder.create({
            onMoveShouldSetPanResponder: (_, gesture) =>
              Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
            onPanResponderMove: (_, gesture) => {
              setPanOffset({ x: gesture.dx, y: gesture.dy });
            },
            onPanResponderRelease: (_, gesture) => {
              setPanOffset((prev) => ({
                x: prev.x + gesture.dx,
                y: prev.y + gesture.dy,
              }));
            },
          })
        : { panHandlers: {} },
    [variant],
  );

  const visible = useMemo(() => {
    if (variant === "map") {
      return showArchived ? nodes : nodes.filter((node) => !node.archived);
    }
    return nodes.filter((node) => !node.archived);
  }, [nodes, showArchived, variant]);

  const isEmpty = mode === "empty" || visible.length === 0;
  const mapLayouts = useMemo(
    () =>
      variant === "map"
        ? visualCaptureFreeze
          ? layoutMapNodesForVisualFixture(visible)
          : layoutMapNodes(visible)
        : [],
    [variant, visible, visualCaptureFreeze],
  );
  const visibleIds = useMemo(() => new Set(visible.map((node) => node.id)), [visible]);
  const mapEdges = useMemo(
    () => (variant === "map" ? visibleEdgesForNodes(edges, visibleIds) : []),
    [variant, edges, visibleIds],
  );

  const layoutIndex = useMemo(() => {
    const index = new Map<string, { xPct: number; yPct: number }>();
    for (const item of mapLayouts) {
      index.set(item.node.id, { xPct: item.xPct, yPct: item.yPct });
    }
    return index;
  }, [mapLayouts]);

  return (
    <View
      style={[
        styles.wrap,
        variant === "map" ? styles.wrapMap : { height: fieldHeight },
      ]}
      testID={testID}
      accessibilityLabel={isEmpty ? "待点亮星座场" : "记忆星座场"}
    >
      <View
        style={[
          styles.sky,
          variant === "map" && styles.skyMap,
          { backgroundColor: visualCaptureFreeze && variant === "map" ? "transparent" : visualCaptureFreeze ? theme.background : theme.backgroundElevated },
        ]}
        {...(variant === "map" ? panResponder.panHandlers : {})}
        testID={`${testID}-viewport`}
      >

        {variant === "map" && visualCaptureFreeze
          ? FIXTURE_DIM_MAP_STARS.map((pos, index) => (
              <View
                key={`fixture-dim-${index}`}
                style={[styles.litStar, { left: `${pos.xPct}%`, top: `${pos.yPct}%` }]}
              >
                <ConstellationStar
                  variant="dim"
                  size={10}
                  themeMode={themeMode}
                  testID={`${testID}-fixture-dim-${index}`}
                />
              </View>
            ))
          : null}

        {variant === "map" && visualCaptureFreeze ? (
          <View
            pointerEvents="none"
            style={[
              styles.fixtureVerticalGuide,
              {
                left: `${FIXTURE_MAP_VERTICAL_GUIDE.xPct}%`,
                top: `${FIXTURE_MAP_VERTICAL_GUIDE.topPct}%`,
                height: `${FIXTURE_MAP_VERTICAL_GUIDE.heightPct}%`,
                backgroundColor: theme.primary,
              },
            ]}
            testID={`${testID}-fixture-vertical-guide`}
          />
        ) : null}

        {variant === "map" ? (
          <Text style={[styles.panHint, { color: theme.textTertiary }]} testID={`${testID}-pan-hint`}>
            拖动逛逛
          </Text>
        ) : null}

        {variant === "map" && visualCaptureFreeze && selectedNodeId
          ? (() => {
              const selectedLayout = layoutIndex.get(selectedNodeId);
              if (!selectedLayout) {
                return null;
              }
              return (
                <View
                  style={[
                    styles.fixtureSelectedGlow,
                    {
                      left: `${selectedLayout.xPct}%`,
                      top: `${selectedLayout.yPct}%`,
                      backgroundColor: theme.primary,
                    },
                  ]}
                  testID={`${testID}-fixture-selected-glow`}
                />
              );
            })()
          : null}

        {variant === "map" && visualCaptureFreeze
          ? FIXTURE_MAP_DECORATIVE_EDGES.map((edge) => {
              const from = edge.from;
              const to = edge.to;
              const dx = to.xPct - from.xPct;
              const dy = to.yPct - from.yPct;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
              return (
                <View
                  key={edge.id}
                  style={[
                    styles.edge,
                    {
                      left: `${from.xPct}%`,
                      top: `${from.yPct}%`,
                      width: `${length}%`,
                      backgroundColor: theme.constellationLine,
                      opacity: edge.opacity,
                      transform: [{ rotate: `${angle}deg` }],
                    },
                  ]}
                  testID={`${testID}-fixture-edge-${edge.id}`}
                />
              );
            })
          : null}

        {variant === "map" && !isEmpty && !visualCaptureFreeze
          ? mapEdges.map((edge) => {
              const from = layoutIndex.get(edge.fromId);
              const to = layoutIndex.get(edge.toId);
              if (!from || !to) {
                return null;
              }
              const dx = to.xPct - from.xPct;
              const dy = to.yPct - from.yPct;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
              return (
                <View
                  key={edge.id}
                  style={[
                    styles.edge,
                    {
                      left: `${from.xPct}%`,
                      top: `${from.yPct}%`,
                      width: `${length}%`,
                      backgroundColor: theme.constellationLine,
                      transform: [{ rotate: `${angle}deg` }, { translateX: panOffset.x * 0.15 }],
                    },
                  ]}
                  testID={`${testID}-edge-${edge.id}`}
                />
              );
            })
          : null}

        {isEmpty ? (
          <>
            {DIM_POSITIONS.map((pos, index) => (
              <View key={`dim-${index}`} style={[styles.dimStar, pos]}>
                <ConstellationStar
                  variant="dim"
                  size={10}
                  themeMode={themeMode}
                  testID={`${testID}-dim-${index}`}
                />
              </View>
            ))}
            <Animated.View
              style={[
                styles.haloOuter,
                {
                  backgroundColor: theme.primaryMuted,
                  transform: [{ scale: breath }],
                },
              ]}
              testID={`${testID}-halo-outer`}
            />
            <Animated.View
              style={[
                styles.haloInner,
                {
                  backgroundColor: theme.accentMuted,
                  transform: [{ scale: breath }],
                },
              ]}
              testID={`${testID}-halo-inner`}
            />
            <Animated.View
              style={{ transform: [{ scale: breath }] }}
              testID={`${testID}-pending`}
            >
              <ConstellationStar
                variant="pending"
                size={PENDING_STAR_SIZE}
                themeMode={themeMode}
                testID={`${testID}-pending-star`}
                accessibilityLabel="待点亮星"
              />
            </Animated.View>
          </>
        ) : variant === "map" ? (
          mapLayouts.map(({ node, xPct, yPct }) => (
            <View
              key={node.id}
              style={[
                styles.litStar,
                {
                  left: `${xPct}%`,
                  top: `${yPct}%`,
                  transform: [
                    { translateX: panOffset.x * 0.15 },
                    { translateY: panOffset.y * 0.15 },
                  ],
                },
              ]}
            >
              <ConstellationStar
                variant={
                  visualCaptureFreeze
                    ? fixtureStarVariantForConcept(node.concept, selectedNodeId ?? null, node.id)
                    : starVariantForNode(node, selectedNodeId ?? null)
                }
                size={
                  visualCaptureFreeze
                    ? selectedNodeId === node.id
                      ? 28
                      : node.concept === "RAG 检索"
                        ? 20
                        : 14
                    : node.archived
                      ? 10
                      : 14
                }
                themeMode={themeMode}
                testID={`${testID}-node-${node.id}`}
                onPress={onSelectNode ? () => onSelectNode(node.id) : undefined}
                accessibilityLabel={node.archived ? `已归档 ${node.concept}` : node.concept}
              />
            </View>
          ))
        ) : (
          visible.slice(0, HOME_NODE_CAP).map((node, index) => (
            <View
              key={node.id}
              style={[
                styles.litStar,
                { top: `${20 + (index % 4) * 16}%`, left: `${15 + (index % 3) * 24}%` },
              ]}
            >
              <ConstellationStar
                variant={selectedNodeId === node.id ? "selected" : "lit"}
                size={14}
                themeMode={themeMode}
                testID={`${testID}-node-${node.id}`}
                onPress={onSelectNode ? () => onSelectNode(node.id) : undefined}
              />
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  wrapMap: {
    flex: 1,
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  sky: {
    flex: 1,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  skyMap: {
    borderRadius: 0,
  },
  panHint: {
    position: "absolute",
    top: 16,
    right: 20,
    fontSize: 12,
    zIndex: 2,
  },
  edge: {
    position: "absolute",
    height: 1,
    transformOrigin: "left center",
  },
  dimStar: {
    position: "absolute",
  },
  haloOuter: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  haloInner: {
    position: "absolute",
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  litStar: {
    position: "absolute",
  },
  fixtureSelectedGlow: {
    position: "absolute",
    width: 72,
    height: 72,
    marginLeft: -36,
    marginTop: -36,
    borderRadius: 36,
    opacity: 0.13,
    zIndex: 0,
  },
  fixtureVerticalGuide: {
    position: "absolute",
    width: 1,
    marginLeft: -0.5,
    opacity: 0.24,
    zIndex: 0,
  },
  fixtureNodeGlowWarm: {
    position: "absolute",
    width: 48,
    height: 48,
    marginLeft: -24,
    marginTop: -24,
    borderRadius: 24,
    opacity: 0.13,
    zIndex: 0,
  },
  fixtureBgGlowPrimary: {
    position: "absolute",
    top: "-8%",
    left: "-20%",
    width: "140%",
    height: "72%",
    borderRadius: 9999,
    opacity: 0.16,
  },
  fixtureBgGlowWarm: {
    position: "absolute",
    bottom: "-6%",
    right: "-18%",
    width: "52%",
    height: "52%",
    borderRadius: 9999,
    opacity: 0.12,
  },
});
