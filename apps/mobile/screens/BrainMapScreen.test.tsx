/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import {
  applyIngestCreate,
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
} from "@my-brain/core";

vi.mock("react-native", () => {
  const RN = (tag: string) =>
    function MockComponent({
      children,
      testID,
      onPress,
      onClick,
      disabled,
      accessibilityLabel,
      accessibilityRole,
      accessibilityState,
      numberOfLines,
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      onClick?: () => void;
      disabled?: boolean;
      accessibilityLabel?: string;
      accessibilityRole?: string;
      accessibilityState?: { selected?: boolean; disabled?: boolean };
      numberOfLines?: number;
    }) {
      return React.createElement(
        onPress ? "button" : tag,
        {
          "data-testid": testID,
          onClick: onPress ?? onClick,
          disabled,
          "aria-label": accessibilityLabel,
          role: accessibilityRole,
          "aria-selected": accessibilityState?.selected,
          "aria-disabled": accessibilityState?.disabled,
          "data-number-of-lines": numberOfLines,
        },
        children,
      );
    };
  return {
    View: RN("div"),
    Text: RN("span"),
    Pressable: RN("button"),
    ScrollView: RN("div"),
    Modal: ({
      children,
      visible,
    }: {
      children?: React.ReactNode;
      visible?: boolean;
    }) => (visible ? React.createElement("div", null, children) : null),
    StyleSheet: { create: (s: object) => s, hairlineWidth: 1 },
    useWindowDimensions: () => ({
      width: 390,
      height: 844,
      scale: 1,
      fontScale: 1,
    }),
    Animated: {
      Value: class {
        setValue() {}
        stopAnimation() {}
      },
      loop: () => ({ start: () => {}, stop: () => {} }),
      sequence: (items: unknown[]) => items[0],
      timing: () => ({}),
    },
    Easing: { inOut: () => ({}), ease: {} },
    PanResponder: {
      create: (config: {
        onMoveShouldSetPanResponder?: () => boolean;
        onPanResponderMove?: () => void;
        onPanResponderRelease?: () => void;
      }) => ({
        panHandlers: {
          onMouseDown: () => config.onMoveShouldSetPanResponder?.(),
        },
      }),
    },
    useColorScheme: () => "dark",
  };
});

import { BrainMapScreen } from "../screens/BrainMapScreen";
import { NavigationProvider } from "../navigation/NavigationContext";
import { ThemeProvider } from "../theme/ThemeProvider";
import { useMobileAppStore } from "../stores/mobileAppStore";

function renderBrainMap() {
  return render(
    <ThemeProvider>
      <NavigationProvider>
        <BrainMapScreen />
      </NavigationProvider>
    </ThemeProvider>,
  );
}

function seedGraphNode(
  graph: InMemoryGraphRepository,
  history: InMemoryHistoryRepository,
  input: {
    concept: string;
    intro: string;
    sourceLinks?: string[];
    archived?: boolean;
  },
) {
  const before = graph.getSnapshot();
  const node = graph.createNode({
    concept: input.concept,
    intro: input.intro,
    sourceLinks: input.sourceLinks ?? [],
  });
  if (input.archived) {
    graph.archiveNode(node.id);
  }
  const after = graph.getSnapshot();
  history.pushChange({
    kind: "node_created",
    summary: `点亮「${input.concept}」`,
    before,
    after,
    createdAt: new Date().toISOString(),
  });
  if (input.sourceLinks && input.sourceLinks.length > 1) {
    const anchor = after.nodes.find((item) => item.id !== node.id && !item.archived);
    if (anchor) {
      const edgeBefore = graph.getSnapshot();
      graph.addEdge({ fromId: node.id, toId: anchor.id, relation: "related_to" });
      history.pushChange({
        kind: "auto_curate_merge",
        summary: `自动关联「${anchor.concept}」`,
        before: edgeBefore,
        after: graph.getSnapshot(),
        createdAt: new Date().toISOString(),
      });
    }
  }
  return node;
}

describe("BrainMapScreen", () => {
  beforeEach(() => {
    useMobileAppStore.setState({
      graph: new InMemoryGraphRepository(),
      history: new InMemoryHistoryRepository(),
      visibleNodes: [],
      degraded: { active: [], voiceDisconnected: false },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders header, pan hint, and bottom pills", () => {
    const graph = useMobileAppStore.getState().graph;
    const history = useMobileAppStore.getState().history;
    seedGraphNode(graph, history, {
      concept: "Provider 抽象",
      intro: "把模型、语音、信息源都藏在可替换接口后面。",
      sourceLinks: ["https://example.com/a"],
    });
    useMobileAppStore.getState().syncGraphView();

    renderBrainMap();

    expect(screen.getByTestId("brain-map-screen")).toBeTruthy();
    expect(screen.getByTestId("brain-map-header-title").textContent).toBe("知识星图");
    expect(screen.getByTestId("brain-map-header-subtitle").textContent).toContain(
      "探索你已经确认留下的知识",
    );
    expect(screen.getByTestId("brain-map-constellation-pan-hint").textContent).toBe("拖动逛逛");
    expect(screen.getByTestId("brain-map-pill-relations")).toBeTruthy();
    expect(screen.getByTestId("brain-map-show-archived-toggle")).toBeTruthy();
  });

  it("opens NodeDetailSheet on star tap with intro, sources, history", () => {
    const graph = useMobileAppStore.getState().graph;
    const history = useMobileAppStore.getState().history;
    const node = seedGraphNode(graph, history, {
      concept: "Provider 抽象",
      intro: "把模型、语音、信息源都藏在可替换接口后面。",
      sourceLinks: ["https://example.com/a", "https://example.com/b"],
    });
    useMobileAppStore.getState().syncGraphView();

    renderBrainMap();
    fireEvent.click(screen.getByTestId(`brain-map-constellation-node-${node.id}-pressable`));

    expect(screen.getByTestId("node-detail-sheet")).toBeTruthy();
    expect(screen.getByTestId("node-detail-sheet-concept").textContent).toBe("Provider 抽象");
    expect(screen.getByTestId("node-detail-sheet-intro").textContent).toContain("可替换接口");
    expect(screen.getByTestId("node-detail-sheet-meta").textContent).toContain("来源 2");
    expect(screen.getByTestId("node-detail-sheet-action-explain")).toBeTruthy();
    expect(screen.getByTestId("node-detail-sheet-action-quiz")).toBeTruthy();
    expect(screen.getByTestId("node-detail-sheet-archive")).toBeTruthy();
  });

  it("shows CK-19 source, state, recent change, and curation reason in node detail", () => {
    const graph = useMobileAppStore.getState().graph;
    const history = useMobileAppStore.getState().history;
    seedGraphNode(graph, history, {
      concept: "Provider 抽象",
      intro: "锚点概念。",
      sourceLinks: ["https://example.com/anchor"],
    });
    const node = seedGraphNode(graph, history, {
      concept: "RAG 检索",
      intro: "检索增强生成。",
      sourceLinks: ["https://example.com/rag", "https://example.com/extra"],
    });
    useMobileAppStore.getState().syncGraphView();

    renderBrainMap();
    fireEvent.click(screen.getByTestId(`brain-map-constellation-node-${node.id}-pressable`));

    expect(screen.getByTestId("node-detail-sheet-evolution")).toBeTruthy();
    expect(screen.getByTestId("node-detail-sheet-source").textContent).toContain(
      "https://example.com/rag",
    );
    expect(screen.getByTestId("node-detail-sheet-state").textContent).toBe("状态：活跃");
    expect(screen.getByTestId("node-detail-sheet-recent-change").textContent).toContain(
      "自动关联",
    );
    expect(screen.getByTestId("node-detail-sheet-curation-reason").textContent).toContain(
      "自动关联",
    );
  });

  it("archives via archive path (not delete) and can toggle archived visibility", () => {
    const graph = useMobileAppStore.getState().graph;
    const history = useMobileAppStore.getState().history;
    const node = seedGraphNode(graph, history, {
      concept: "RAG 检索",
      intro: "检索增强生成。",
    });
    useMobileAppStore.getState().syncGraphView();

    renderBrainMap();
    fireEvent.click(screen.getByTestId(`brain-map-constellation-node-${node.id}-pressable`));
    fireEvent.click(screen.getByTestId("node-detail-sheet-archive"));

    expect(graph.getSnapshot().nodes.find((item) => item.id === node.id)?.archived).toBe(true);
    expect(history.listChanges().some((change) => change.kind === "node_archived")).toBe(true);

    fireEvent.click(screen.getByTestId("brain-map-show-archived-toggle"));
    expect(screen.getByTestId(`brain-map-constellation-node-${node.id}`)).toBeTruthy();
  });

  it("shows restore path for archived nodes", () => {
    const graph = useMobileAppStore.getState().graph;
    const history = useMobileAppStore.getState().history;
    const node = seedGraphNode(graph, history, {
      concept: "旧概念",
      intro: "已归档示例",
      archived: true,
    });
    useMobileAppStore.getState().syncGraphView();

    renderBrainMap();
    fireEvent.click(screen.getByTestId("brain-map-show-archived-toggle"));
    fireEvent.click(screen.getByTestId(`brain-map-constellation-node-${node.id}-pressable`));

    expect(screen.getByTestId("node-detail-sheet-state").textContent).toBe("状态：已归档");
    expect(screen.getByTestId("node-detail-sheet-archived-hint").textContent).toContain(
      "归档不是删除",
    );
    fireEvent.click(screen.getByTestId("node-detail-sheet-archive-restore"));
    expect(graph.getSnapshot().nodes.find((item) => item.id === node.id)?.archived).toBe(false);
  });

  it("closes sheet and clears selection", () => {
    const graph = useMobileAppStore.getState().graph;
    const history = useMobileAppStore.getState().history;
    const node = seedGraphNode(graph, history, {
      concept: "临时概念",
      intro: "关闭测试",
    });
    useMobileAppStore.getState().syncGraphView();

    renderBrainMap();
    fireEvent.click(screen.getByTestId(`brain-map-constellation-node-${node.id}-pressable`));
    fireEvent.click(screen.getByTestId("node-detail-sheet-backdrop"));
    expect(screen.queryByTestId("node-detail-sheet")).toBeNull();
  });

  it("shows ingested node from graph after syncGraphView", () => {
    const graph = useMobileAppStore.getState().graph;
    const history = useMobileAppStore.getState().history;
    const result = applyIngestCreate(
      {
        concept: "确认入库概念",
        intro: "来自用户确认路径",
        sourceLinks: ["signal:live-1"],
      },
      { graph, history },
    );
    useMobileAppStore.getState().syncGraphView();

    renderBrainMap();
    expect(screen.getByTestId(`brain-map-constellation-node-${result.nodeId}`)).toBeTruthy();
    expect(screen.queryByTestId("brain-map-empty")).toBeNull();
  });

  it("renders empty state when graph has no visible nodes", () => {
    renderBrainMap();
    expect(screen.getByTestId("brain-map-empty")).toBeTruthy();
  });

  it("does not expose hard delete UI copy", () => {
    renderBrainMap();
    expect(screen.getByTestId("brain-map-screen").textContent).not.toContain("删除");
    expect(screen.getByTestId("brain-map-screen").textContent).toContain("归档");
  });
});
