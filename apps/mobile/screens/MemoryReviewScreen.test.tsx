/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
  type LearningTraceRecord,
  type MemoryReplayResult,
  type MemoryWeatherResult,
  type ReverseQuestionResult,
  type UserModeProfile,
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
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      onClick?: () => void;
      disabled?: boolean;
      accessibilityLabel?: string;
      accessibilityRole?: string;
    }) {
      return React.createElement(
        onPress ? "button" : tag,
        {
          "data-testid": testID,
          onClick: onPress ?? onClick,
          disabled,
          "aria-label": accessibilityLabel,
          role: accessibilityRole,
        },
        children,
      );
    };
  return {
    View: RN("div"),
    Text: RN("span"),
    Pressable: RN("button"),
    ScrollView: RN("div"),
    StyleSheet: { create: (s: object) => s, hairlineWidth: 1 },
  };
});

vi.mock("../navigation/NavigationContext", () => ({
  useNavigation: () => ({ goBack: vi.fn() }),
}));

vi.mock("../theme/ThemeProvider", () => ({
  useTheme: () => ({
    mode: "dark" as const,
    colors: { background: "#14161C" },
  }),
}));

vi.mock("../components/ui/VoiceOrb", () => ({
  VoiceOrb: ({ testID }: { testID?: string }) =>
    React.createElement("div", { "data-testid": testID ?? "voice-orb" }),
}));

const profile: UserModeProfile = {
  primaryMode: "tech_tracker",
  secondaryModes: [],
  confidence: 0.8,
};

const weather: MemoryWeatherResult = {
  visible: true,
  cards: [
    {
      outputKind: "trend",
      headline: "Realtime API 趋势入库",
      detail: "图谱变化 · node_created",
      evidenceRefs: ["graph_change:chg-1"],
      confidence: 0.9,
    },
  ],
};

const replay: MemoryReplayResult = {
  visible: true,
  outputKind: "ingest_timeline",
  frames: [
    {
      changeId: "c1",
      summary: "点亮「Realtime API」",
      evidenceRefs: ["graph_change:c1"],
      at: new Date().toISOString(),
    },
  ],
  cursor: "cursor-1",
  durationMs: 20_000,
};

const question: ReverseQuestionResult = {
  visible: true,
  outputKind: "relation_why",
  prompt: "「Realtime API」最近为何值得跟进？",
  evidenceRefs: ["node:node-1"],
  nodeIds: ["node-1"],
};

let mockState: {
  degraded: { active: string[] };
  learningTraces: LearningTraceRecord[];
  userProfile: UserModeProfile | null;
  m5Experiences: {
    weather: MemoryWeatherResult;
    replay: MemoryReplayResult;
    reverseQuestion: ReverseQuestionResult;
  } | null;
  graph: InMemoryGraphRepository;
  history: InMemoryHistoryRepository;
  storageReady: boolean;
  refreshM5Experiences: ReturnType<typeof vi.fn>;
};

vi.mock("../stores/mobileAppStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../stores/mobileAppStore")>();
  return {
    ...actual,
    useMobileAppStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  };
});

vi.mock("../hooks/useCognitiveAction", () => ({
  useCognitiveAction: () => ({
    phase: "idle",
    draft: null,
    executionResult: null,
    executionConfig: { enabled: false, baseUrl: "", apiKey: "" },
    canRemoteExecute: false,
    startDraft: vi.fn(),
    saveDraftLocally: vi.fn(),
    cancel: vi.fn(),
    openConfirmation: vi.fn(),
    confirmAndExecute: vi.fn(),
    retryExecute: vi.fn(),
  }),
}));

vi.mock("../components/ActionPreviewSheet", () => ({
  ActionPreviewSheet: ({ testID }: { testID?: string }) =>
    React.createElement("div", { "data-testid": testID ?? "action-preview-sheet" }),
}));

import { MemoryReviewScreen } from "./MemoryReviewScreen";

describe("MemoryReviewScreen", () => {
  beforeEach(() => {
    mockState = {
      degraded: { active: [] },
      learningTraces: [],
      userProfile: profile,
      m5Experiences: { weather, replay, reverseQuestion: question },
      graph: new InMemoryGraphRepository(),
      history: new InMemoryHistoryRepository(),
      storageReady: true,
      refreshM5Experiences: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
  });

  it("renders aggregated memory review sections with evidence", () => {
    render(<MemoryReviewScreen />);
    expect(screen.getByTestId("memory-review-screen")).toBeTruthy();
    expect(screen.getByTestId("memory-review-header-title").textContent).toContain("记忆回顾");
    expect(screen.getByTestId("memory-weather-headline").textContent).toContain("Realtime");
    expect(screen.getByTestId("memory-weather-evidence").textContent).toContain("graph_change:chg-1");
    expect(screen.getByTestId("memory-replay-timeline")).toBeTruthy();
    expect(screen.getByTestId("reverse-question-prompt").textContent).toContain("Realtime API");
    expect(screen.getByTestId("reverse-question-evidence").textContent).toContain("node:node-1");
    expect(screen.getByTestId("weekly-brain-review")).toBeTruthy();
  });

  it("shows empty reverse question state without graph nodes", () => {
    mockState.m5Experiences = {
      weather,
      replay,
      reverseQuestion: {
        visible: false,
        outputKind: "recall_day",
        prompt: "",
        evidenceRefs: [],
        nodeIds: [],
      },
    };
    render(<MemoryReviewScreen />);
    expect(screen.getByTestId("reverse-question-empty")).toBeTruthy();
  });

  it("toggles replay and weekly review actions", () => {
    render(<MemoryReviewScreen />);
    fireEvent.click(screen.getByTestId("memory-review-start-replay"));
    expect(screen.getByTestId("memory-review-start-replay").textContent).toContain("回放中");
    fireEvent.click(screen.getByTestId("memory-review-generate-weekly"));
    expect(screen.getByTestId("memory-review-generate-weekly").textContent).toContain("收起");
  });

  it("shows storage empty hint when graph and history are empty", () => {
    mockState.storageReady = true;
    render(<MemoryReviewScreen />);
    expect(screen.getByTestId("memory-review-storage-empty")).toBeTruthy();
  });

  it("shows recent curation summaries from graph history", () => {
    const graph = new InMemoryGraphRepository();
    graph.createNode({
      concept: "向量检索",
      intro: "主题",
      sourceLinks: [],
    });
    const history = new InMemoryHistoryRepository();
    history.pushChange({
      kind: "edge_created",
      summary: "自动关联相似概念",
      before: graph.getSnapshot(),
      after: graph.getSnapshot(),
      createdAt: new Date().toISOString(),
    });

    mockState.graph = graph;
    mockState.history = history;

    render(<MemoryReviewScreen />);
    expect(screen.getByTestId("memory-curation-history-card")).toBeTruthy();
    expect(screen.getByText("自动关联相似概念")).toBeTruthy();
  });

  it("refreshes m5 experiences on mount", () => {
    render(<MemoryReviewScreen />);
    expect(mockState.refreshM5Experiences).toHaveBeenCalled();
  });

  it("weekly review cites learning trace evidence when traces exist", () => {
    const now = Date.now();
    const graph = new InMemoryGraphRepository();
    graph.createNode({
      concept: "向量检索",
      intro: "本周深聊主题",
      sourceLinks: [],
    });
    const history = new InMemoryHistoryRepository();
    history.pushChange({
      kind: "node_created",
      summary: "点亮「向量检索」",
      before: { nodes: [], edges: [] },
      after: graph.getSnapshot(),
      createdAt: new Date(now).toISOString(),
    });

    mockState.graph = graph;
    mockState.history = history;
    mockState.learningTraces = [
      {
        id: "lt-weekly-1",
        topic: "向量检索",
        note: "本周深聊",
        createdAt: new Date(now).toISOString(),
      },
    ];

    render(<MemoryReviewScreen />);
    fireEvent.click(screen.getByTestId("memory-review-generate-weekly"));

    expect(screen.getByTestId("weekly-brain-review-summary").textContent).toContain("学习痕迹");
    expect(screen.getByTestId("weekly-brain-review-evidence").textContent).toContain(
      "learning_trace:lt-weekly-1",
    );
  });

  it("shows profile-aware draft actions when weekly review is expanded", () => {
    const graph = new InMemoryGraphRepository();
    graph.createNode({
      concept: "Realtime API",
      intro: "语音实时接口",
      sourceLinks: [],
    });

    mockState.graph = graph;
    mockState.userProfile = {
      primaryMode: "creator_researcher",
      secondaryModes: ["learner"],
      confidence: 0.85,
      recentIntent: "整理研究素材",
    };

    render(<MemoryReviewScreen />);
    fireEvent.click(screen.getByTestId("memory-review-generate-weekly"));

    expect(screen.getByTestId("weekly-brain-review-profile-draft")).toBeTruthy();
    expect(screen.getByTestId("weekly-brain-review-profile-summary").textContent).toContain(
      "活跃概念",
    );
    expect(screen.getByTestId("memory-review-draft-actions")).toBeTruthy();
    expect(screen.getByTestId("memory-review-draft-actions-draft-writing")).toBeTruthy();
    expect(screen.getByTestId("memory-review-draft-actions-boundary")).toBeTruthy();
  });
});
